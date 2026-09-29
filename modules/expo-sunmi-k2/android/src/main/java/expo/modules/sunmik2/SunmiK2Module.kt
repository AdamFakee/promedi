package expo.modules.sunmik2

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.graphics.BitmapFactory
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.sunmi.nfc.INfcListener
import com.sunmi.nfc.Nfc
import com.sunmi.peripheralsdk.NfcManager
import com.sunmi.printerx.PrinterSdk
import com.sunmi.printerx.enums.Align
import com.sunmi.printerx.enums.ImageAlgorithm
import com.sunmi.printerx.style.BitmapStyle

import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunmiK2Module : Module() {

    private val TAG = "SunmiK2Module"
    private var registeredNfcListener: INfcListener.Stub? = null
    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private val currentActivity: Activity
        get() = appContext.currentActivity ?: throw Exceptions.MissingActivity()

    override fun definition() = ModuleDefinition {
        Name("SunmiK2")

        Events("onNFCScanned", "onPrinterStatusChanged")

        OnCreate {
            initSunmiNfcSDK()
        }

        OnActivityEntersForeground {
            setupAndEnableForegroundDispatch()
        }

        OnActivityEntersBackground {
            disableForegroundDispatch()
        }

        OnNewIntent { intent ->
            handleNfcIntent(intent)
        }

        OnDestroy {
            cleanupSunmiNfcSDK()
        }

        // ─── NFC Native Methods ─────────────────────────────────

        Function("isNfcSupported") {
            try {
                val adapter = NfcAdapter.getDefaultAdapter(appContext.reactContext)
                adapter != null && adapter.isEnabled
            } catch (e: Exception) {
                false
            }
        }

        Function("switchNfcModule") { sn: String ->
            try {
                NfcManager.switchNfc(sn)
                Log.d(TAG, "Switched NFC module to SN: $sn")
            } catch (e: Exception) {
                Log.e(TAG, "Error switching NFC module", e)
            }
        }

        Function("setWatermarkAlpha") { alpha: Int ->
            try {
                val clamped = alpha.coerceIn(0, 255)
                NfcManager.setNfcWaterMarkAlpha(clamped)
                Log.d(TAG, "Set NFC Watermark Alpha to: $clamped")
            } catch (e: Exception) {
                Log.e(TAG, "Error setting watermark alpha", e)
            }
        }

        // ─── Printer Native Methods ─────────────────────────────

        AsyncFunction("printReceiptAsync") { base64Image: String, promise: Promise ->
            printBitmapInternal(base64Image, align = Align.CENTER, binarizeValue = 128, autoOut = true, promise = promise)
        }

        AsyncFunction("printBitmapWithOptionsAsync") { base64Image: String, options: Map<String, Any?>, promise: Promise ->
            val alignStr = options["align"] as? String ?: "center"
            val align = when (alignStr.lowercase()) {
                "left" -> Align.LEFT
                "right" -> Align.RIGHT
                else -> Align.CENTER
            }
            val binarizeValue = (options["binarizeValue"] as? Number)?.toInt() ?: 128
            val autoOut = (options["autoOut"] as? Boolean) ?: true

            printBitmapInternal(base64Image, align, binarizeValue, autoOut, promise)
        }

        AsyncFunction("getPrinterStatusAsync") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("MISSING_CONTEXT", "React application context is null", null)
                    return@AsyncFunction
                }

                PrinterSdk.getInstance().getPrinter(context, object : PrinterSdk.PrinterListen {
                    override fun onDefPrinter(printer: PrinterSdk.Printer?) {
                        if (printer != null) {
                            promise.resolve(mapOf(
                                "connected" to true,
                                "paperPresent" to true,
                                "message" to "Default printer connected"
                            ))
                        } else {
                            promise.resolve(mapOf(
                                "connected" to false,
                                "paperPresent" to false,
                                "message" to "No default printer found"
                            ))
                        }
                    }

                    override fun onPrinters(printers: MutableList<PrinterSdk.Printer>?) {
                        // Optional multi-printer callback
                    }
                })
            } catch (e: Exception) {
                promise.reject("PRINTER_ERROR", e.message ?: "Unknown printer error", e)
            }
        }

        AsyncFunction("feedPaperAsync") { lines: Int, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("MISSING_CONTEXT", "React application context is null", null)
                    return@AsyncFunction
                }

                PrinterSdk.getInstance().getPrinter(context, object : PrinterSdk.PrinterListen {
                    override fun onDefPrinter(printer: PrinterSdk.Printer?) {
                        if (printer != null) {
                            try {
                                printer.lineApi().initLine(null)
                                val blankLines = "\n".repeat(lines.coerceIn(1, 20))
                                printer.lineApi().printText(blankLines, null)
                                promise.resolve(true)
                            } catch (err: Exception) {
                                promise.reject("FEED_ERROR", err.message ?: "Failed to feed paper", err)
                            }
                        } else {
                            promise.reject("NO_PRINTER", "Printer not found", null)
                        }
                    }

                    override fun onPrinters(printers: MutableList<PrinterSdk.Printer>?) {}
                })
            } catch (e: Exception) {
                promise.reject("FEED_ERROR", e.message ?: "Error feeding paper", e)
            }
        }

        AsyncFunction("cutPaperAsync") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("MISSING_CONTEXT", "React application context is null", null)
                    return@AsyncFunction
                }

                PrinterSdk.getInstance().getPrinter(context, object : PrinterSdk.PrinterListen {
                    override fun onDefPrinter(printer: PrinterSdk.Printer?) {
                        if (printer != null) {
                            try {
                                printer.lineApi().autoOut()
                                promise.resolve(true)
                            } catch (err: Exception) {
                                promise.reject("CUT_ERROR", err.message ?: "Failed to cut paper", err)
                            }
                        } else {
                            promise.reject("NO_PRINTER", "Printer not found", null)
                        }
                    }

                    override fun onPrinters(printers: MutableList<PrinterSdk.Printer>?) {}
                })
            } catch (e: Exception) {
                promise.reject("CUT_ERROR", e.message ?: "Error cutting paper", e)
            }
        }
    }

    // ─── Sunmi SDK & NFC Methods ──────────────────────────────

    private fun initSunmiNfcSDK() {
        try {
            val context = appContext.reactContext ?: return
            NfcManager.init(context) { success ->
                if (success) {
                    Log.d(TAG, "Sunmi NFC SDK initialized successfully")
                    registerNfcModuleListener()
                } else {
                    Log.w(TAG, "Sunmi NFC SDK initialization returned false")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing Sunmi NFC SDK", e)
        }
    }

    private fun registerNfcModuleListener() {
        val listener = object : INfcListener.Stub() {
            override fun onNfcListChanged(nfcList: MutableList<Nfc>?) {
                if (!nfcList.isNullOrEmpty()) {
                    val sn = nfcList[0].sn ?: ""
                    if (sn.isNotEmpty()) {
                        Log.d(TAG, "Sunmi NFC scanned card UID: $sn")
                        mainHandler.post {
                            sendEvent("onNFCScanned", mapOf(
                                "cardUid" to sn,
                                "source" to "sunmi"
                            ))
                        }
                    }
                }
            }
        }
        registeredNfcListener = listener
        try {
            NfcManager.registerNfcListener(listener)
        } catch (e: Exception) {
            Log.e(TAG, "Error registering Sunmi NFC listener", e)
        }
    }

    private fun setupAndEnableForegroundDispatch() {
        try {
            val activity = currentActivity
            nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
            if (nfcAdapter == null) return

            val intent = Intent(activity, activity.javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            pendingIntent = PendingIntent.getActivity(activity, 0, intent, flags)
            nfcAdapter?.enableForegroundDispatch(activity, pendingIntent, null, null)
            Log.d(TAG, "Android NFC Foreground Dispatch enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling NFC Foreground Dispatch", e)
        }
    }

    private fun disableForegroundDispatch() {
        try {
            nfcAdapter?.disableForegroundDispatch(currentActivity)
            Log.d(TAG, "Android NFC Foreground Dispatch disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling Foreground Dispatch", e)
        }
    }

    private fun handleNfcIntent(intent: Intent) {
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_TECH_DISCOVERED == intent.action
        ) {
            @Suppress("DEPRECATION")
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            val hexUid = tag?.id?.joinToString("") { "%02X".format(it) } ?: ""
            if (hexUid.isNotEmpty()) {
                Log.d(TAG, "Android System NFC tag discovered: $hexUid")
                mainHandler.post {
                    sendEvent("onNFCScanned", mapOf(
                        "cardUid" to hexUid,
                        "source" to "system"
                    ))
                }
            }
        }
    }

    private fun printBitmapInternal(
        base64Image: String,
        align: Align,
        binarizeValue: Int,
        autoOut: Boolean,
        promise: Promise
    ) {
        try {
            val context = appContext.reactContext ?: run {
                promise.reject("MISSING_CONTEXT", "React application context is null", null)
                return
            }

            val cleanBase64 = base64Image.replace(Regex("^data:image/\\w+;base64,"), "")
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            if (bitmap == null) {
                promise.reject("INVALID_IMAGE", "Could not decode Base64 into a valid Bitmap", null)
                return
            }

            PrinterSdk.getInstance().getPrinter(context, object : PrinterSdk.PrinterListen {
                override fun onDefPrinter(printer: PrinterSdk.Printer?) {
                    if (printer == null) {
                        promise.reject("NO_PRINTER", "Sunmi Printer instance is null or not found", null)
                        return
                    }

                    try {
                        printer.lineApi().initLine(null)
                        val style = BitmapStyle.getStyle().apply {
                            setAlign(align)
                            setAlgorithm(ImageAlgorithm.BINARIZATION)
                            setValue(binarizeValue.coerceIn(0, 255))
                        }
                        printer.lineApi().printBitmap(bitmap, style)
                        if (autoOut) {
                            printer.lineApi().autoOut()
                        }
                        promise.resolve(true)
                    } catch (e: Exception) {
                        Log.e(TAG, "Printer execution error", e)
                        promise.reject("PRINT_FAILED", e.message ?: "Printer execution error", e)
                    }
                }

                override fun onPrinters(printers: MutableList<PrinterSdk.Printer>?) {}
            })
        } catch (e: Exception) {
            Log.e(TAG, "PrintBitmap error", e)
            promise.reject("PRINT_ERROR", e.message ?: "Error processing print request", e)
        }
    }

    private fun cleanupSunmiNfcSDK() {
        try {
            registeredNfcListener?.let { NfcManager.unregisterNfcListener(it) }
            val context = appContext.reactContext
            if (context != null) {
                NfcManager.destroy(context)
            }
            Log.d(TAG, "Sunmi NFC SDK cleaned up")
        } catch (e: Exception) {
            Log.e(TAG, "Error destroying Sunmi NFC SDK", e)
        }
    }
}
