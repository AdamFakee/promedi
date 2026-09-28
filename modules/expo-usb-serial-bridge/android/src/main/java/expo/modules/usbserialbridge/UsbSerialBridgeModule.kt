/**
 * Native Module Expo (Kotlin) — Cầu nối bọc thư viện usb-serial-for-android (v3.11.0)
 *
 * Chức năng:
 * - Giao tiếp với các thiết bị USB-to-Serial (InBody 260S, BPBIO750, CH340, FTDI, CP210x...) qua Android USB Host API.
 * - Đa cổng độc lập: Đọc/Ghi song song nhiều cổng Serial đồng thời mà không trộn lẫn dữ liệu.
 * - Quản lý quyền truy cập USB bất đồng bộ kèm bộ lọc so khớp `EXTRA_DEVICE` tránh lỗi xin quyền song song.
 *
 * @module modules/expo-usb-serial-bridge
 */

package expo.modules.usbserialbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import android.os.Build
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import com.hoho.android.usbserial.util.SerialInputOutputManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.Executors

/** Action ngầm định sử dụng cho BroadcastReceiver cấp quyền USB */
private const val ACTION_USB_PERMISSION = "expo.modules.usbserialbridge.USB_PERMISSION"

class UsbSerialBridgeModule : Module() {
  /**
   * Cấu trúc lưu trữ thông tin cổng Serial đang mở.
   *
   * @property connection Kết nối USB mức hệ thống Android.
   * @property port Cổng UsbSerialPort của thư viện usb-serial-for-android.
   * @property ioManager Quản lý luồng đọc/ghi dữ liệu không chặn (Non-blocking IO Manager).
   */
  private data class OpenPort(
    val connection: UsbDeviceConnection,
    val port: UsbSerialPort,
    val ioManager: SerialInputOutputManager,
  )

  /** Map quản lý danh sách các cổng đang mở, key = portId logic (VD: 'inbody', 'bpbio', 'probe:inbody') */
  private val openPorts = mutableMapOf<String, OpenPort>()


  /** Getter hỗ trợ truy cập UsbManager từ Android Context */
  private val usbManager: UsbManager
    get() = appContext.reactContext!!.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    // Tên module expose sang JS/TS: requireNativeModule('UsbSerialBridge')
    Name("UsbSerialBridge")

    // Danh sách các Sự kiện (Events) phát ngược về phía JS Event Emitter
    Events("onData", "onError", "onDetached")

    /**
     * Liệt kê tất cả các thiết bị USB đang cắm vào Kiosk có driver chip hỗ trợ.
     *
     * @return List<Map> Danh sách thông tin cơ bản: deviceKey (vendorId:productId:deviceId), vendorId, productId, deviceName.
     */
    AsyncFunction("listDevices") {
      UsbSerialProber.getDefaultProber().findAllDrivers(usbManager).map { driver ->
        val d = driver.device
        mapOf(
          "deviceKey" to "${d.vendorId}:${d.productId}:${d.deviceId}",
          "vendorId" to d.vendorId,
          "productId" to d.productId,
          "deviceName" to d.deviceName
        )
      }
    }

    /**
     * Liệt kê TẤT CẢ thiết bị USB thô nhận diện bởi Android OS (kể cả chưa có driver Serial).
     * Phục vụ chẩn đoán khi cắm cáp USB Type-C hoặc thiết bị không phải chip Serial chuẩn.
     */
    AsyncFunction("listRawUsbDevices") {
      usbManager.deviceList.values.map { d ->
        mapOf(
          "deviceKey" to "${d.vendorId}:${d.productId}:${d.deviceId}",
          "vendorId" to d.vendorId,
          "productId" to d.productId,
          "deviceName" to d.deviceName,
          "deviceClass" to d.deviceClass,
          "deviceSubclass" to d.deviceSubclass
        )
      }
    }

    /**
     * Xin quyền truy cập thiết bị USB từ Android OS (nếu ứng dụng chưa được cấp sẵn).
     *
     * @param deviceKey Định danh thiết bị USB dạng "vendorId:productId:deviceId".
     * @param promise Promise trả về true nếu được cấp quyền, ném lỗi PERMISSION_DENIED nếu từ chối.
     */
    AsyncFunction("requestPermission") { deviceKey: String, promise: Promise ->
      val driver = findDriverByKey(deviceKey)
      if (driver == null) {
        promise.reject("DEVICE_NOT_FOUND", "Không tìm thấy USB device với key $deviceKey", null)
        return@AsyncFunction
      }
      val targetDevice = driver.device

      // Nếu đã có quyền sẵn từ trước -> Resolve ngay lập tức
      if (usbManager.hasPermission(targetDevice)) {
        promise.resolve(true)
        return@AsyncFunction
      }

      // Đăng ký BroadcastReceiver để lắng nghe phản hồi cấp quyền từ Dialog hệ thống
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          if (intent.action == ACTION_USB_PERMISSION) {
            // Đọc đối tượng UsbDevice từ Intent phản hồi (hỗ trợ tương thích từ Android 13+ TIRAMISU)
            val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
              intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
              @Suppress("DEPRECATION")
              intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            }

            // Lọc chính xác deviceKey để tránh race-condition khi xin quyền nhiều thiết bị cùng lúc
            if (device != null && "${device.vendorId}:${device.productId}:${device.deviceId}" == deviceKey) {
              try {
                appContext.reactContext?.unregisterReceiver(this)
              } catch (_: Exception) {}

              val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
              if (granted) promise.resolve(true)
              else promise.reject("PERMISSION_DENIED", "Người dùng từ chối quyền USB cho $deviceKey", null)
            }
          }
        }
      }

      // Đặt cờ PendingIntent MUTABLE theo chuẩn an toàn Android 12 (API 31+)
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        android.app.PendingIntent.FLAG_MUTABLE
      } else {
        0
      }

      val permIntent = android.app.PendingIntent.getBroadcast(
        appContext.reactContext, 0, Intent(ACTION_USB_PERMISSION), flags
      )

      val filter = IntentFilter(ACTION_USB_PERMISSION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        appContext.reactContext?.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        appContext.reactContext?.registerReceiver(receiver, filter)
      }

      // Bật Dialog xin quyền của hệ thống Android
      usbManager.requestPermission(targetDevice, permIntent)
    }

    /**
     * Mở cổng USB-to-Serial theo portId chỉ định.
     *
     * @param portId Định danh logic cổng (VD: 'inbody', 'bpbio', 'probe:inbody').
     * @param deviceKey Định danh USB device dạng "vendorId:productId:deviceId".
     * @param baudRate Tốc độ truyền baud (VD: 19200 cho InBody, 9600 cho BPBIO750).
     */
    AsyncFunction("open") { portId: String, deviceKey: String, baudRate: Int, promise: Promise ->
      try {
        // Tự động đóng kết nối cũ trên portId này nếu đang tồn tại trước khi mở mới
        openPorts[portId]?.let { closePortInternal(portId, it) }

        val driver = findDriverByKey(deviceKey)
        if (driver == null) {
          promise.reject("DEVICE_NOT_FOUND", "Không tìm thấy USB device với key $deviceKey", null)
          return@AsyncFunction
        }
        if (!usbManager.hasPermission(driver.device)) {
          promise.reject("PERMISSION_DENIED", "Chưa có quyền USB cho $deviceKey — gọi requestPermission() trước", null)
          return@AsyncFunction
        }

        // Mở kết nối UsbDeviceConnection
        val connection = usbManager.openDevice(driver.device)
          ?: return@AsyncFunction promise.reject("CONNECT_FAILED", "openDevice() trả về null cho $deviceKey", null)

        val port = driver.ports[0] // Các dòng dongle USB-Serial phổ biến dùng port index 0
        port.open(connection)

        // Cấu hình tham số cổng chuẩn 8N1 (8 Data bits, 1 Stop bit, No Parity)
        port.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)

        // Bật tín hiệu DTR/RTS (Bắt ngoại lệ an toàn nếu chip không hỗ trợ)
        try {
          port.dtr = true
          port.rts = true
        } catch (_: UnsupportedOperationException) {}

        // Khởi tạo SerialInputOutputManager để đọc byte thô ngầm bất đồng bộ
        val ioManager = SerialInputOutputManager(port, object : SerialInputOutputManager.Listener {
          override fun onNewData(data: ByteArray) {
            // Khi có byte thô tới -> Bắn Event onData kèm portId sang JavaScript
            sendEvent("onData", mapOf("portId" to portId, "bytes" to data))
          }

          override fun onRunError(e: Exception) {
            // Bắt lỗi khi ngắt kết nối vật lý (ví dụ rút dây USB giữa chừng)
            val stale = openPorts[portId]
            if (stale != null) closePortInternal(portId, stale)
            sendEvent("onDetached", mapOf("portId" to portId, "message" to (e.message ?: "Disconnected")))
          }
        })

        // Lưu cổng mở vào Map và khởi chạy luồng đọc ngầm qua ioManager.start()
        openPorts[portId] = OpenPort(connection, port, ioManager)
        ioManager.start()


        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CONNECT_FAILED", e.message ?: "Mở cổng thất bại", e)
      }
    }

    /**
     * Ghi mảng byte dữ liệu xuống thiết bị qua portId đã mở.
     *
     * @param portId Định danh logic cổng.
     * @param bytes Mảng byte dữ liệu cần gửi.
     */
    AsyncFunction("write") { portId: String, bytes: IntArray, promise: Promise ->
      val openPort = openPorts[portId]
      if (openPort == null) {
        promise.reject("WRITE_FAILED", "Port '$portId' chưa mở hoặc đã bị đóng", null)
        return@AsyncFunction
      }
      try {
        // Chuyển mảng số IntArray từ JS [2, 115, 3] sang ByteArray chuẩn Android Serial
        val byteArray = bytes.map { it.toByte() }.toByteArray()
        // Ghi mảng byte ra cổng Serial với timeout tối đa 1000ms
        openPort.port.write(byteArray, 1000)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("WRITE_FAILED", e.message ?: "Ghi dữ liệu thất bại", e)
      }
    }

    /**
     * Đóng cổng Serial và dọn dẹp tài nguyên theo portId.
     *
     * @param portId Định danh logic cổng cần đóng.
     */
    AsyncFunction("close") { portId: String, promise: Promise ->
      openPorts[portId]?.let { closePortInternal(portId, it) }
      promise.resolve(null)
    }

    /**
     * Lấy danh sách tên thiết bị chuẩn Android device node (Giữ tương thích ngược cho Resolver).
     */
    AsyncFunction("listDevNodes") {
      UsbSerialProber.getDefaultProber().findAllDrivers(usbManager).map { it.device.deviceName }
    }
  }

  /**
   * Helper tìm kiếm UsbSerialDriver khớp với deviceKey ("vendorId:productId:deviceId").
   */
  private fun findDriverByKey(deviceKey: String): UsbSerialDriver? {
    return UsbSerialProber.getDefaultProber().findAllDrivers(usbManager).firstOrNull { driver ->
      val d = driver.device
      "${d.vendorId}:${d.productId}:${d.deviceId}" == deviceKey
    }
  }

  /**
   * Helper dọn dẹp và giải phóng tài nguyên cổng Serial an toàn:
   * Dừng IOManager ➔ Đóng UsbSerialPort ➔ Đóng UsbDeviceConnection.
   */
  private fun closePortInternal(portId: String, openPort: OpenPort) {
    openPorts.remove(portId)
    try {
      openPort.ioManager.stop()
      openPort.port.close()
      openPort.connection.close()
    } catch (_: Exception) {}
  }
}
