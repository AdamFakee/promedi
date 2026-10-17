/**
 * @file VL53L8CXDriver.h
 * @brief Header định nghĩa Driver C++ cho Cảm biến Khoảng cách Time-of-Flight STMicroelectronics VL53L8CX (8x8 Zones).
 *
 * Driver này chịu trách nhiệm:
 * 1. Khởi tạo & cấu hình cảm biến VL53L8CX (Chế độ 8x8 zones @ 15-30Hz).
 * 2. Hỗ trợ 2 giao diện phần cứng:
 *    - Giao diện SPI Tốc độ cao (VSPI 10-20MHz): SCK(18), MISO(19), MOSI(23), CS(5), LPN(4)
 *    - Giao diện I2C Tiêu chuẩn (1MHz Fast Mode Plus): SDA(21), SCL(22), LPN(4)
 * 3. Cấu hình quang học tối ưu nhân trắc học từ ST UM3109:
 *    - Target Order: CLOSEST (Ưu tiên đỉnh đầu người gần trần nhất)
 *    - Sharpener Percent: 1% (Lọc mép tán xạ biên giữa đỉnh đầu và vai)
 * 4. Hỗ trợ chế độ Giả lập (Mock Mode) sinh ma trận dữ liệu đỉnh đầu người đứng không cần phần cứng.
 * 5. Đóng gói dữ liệu nhị phân (Binary Protocol) 204 Bytes truyền qua USB Serial với kiểm tra mã CRC16-Modbus.
 */

#ifndef VL53L8CX_DRIVER_H
#define VL53L8CX_DRIVER_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

// ============================================================================
// ĐỊNH NGHĨA CHÂN KẾT NỐI PHẦN CỨNG (HARDWARE PINOUT - ESP32 -> VL53L8CX)
// ============================================================================

// 1. Chân SPI Chuẩn (VSPI Bus - Tối ưu hiệu năng 15-30Hz)
#define VL53L8CX_PIN_SCK     18  // ESP32 GPIO 18 -> Sensor SCLK / SCL
#define VL53L8CX_PIN_MISO    19  // ESP32 GPIO 19 -> Sensor MISO / SDO
#define VL53L8CX_PIN_MOSI    23  // ESP32 GPIO 23 -> Sensor MOSI / SDA
#define VL53L8CX_PIN_CS      5   // ESP32 GPIO 5  -> Sensor NCS / CS
#define VL53L8CX_PIN_LPN     4   // ESP32 GPIO 4  -> Sensor LPn (Enable)
#define VL53L8CX_PIN_INT     17  // ESP32 GPIO 17 -> Sensor INT (Data ready ngắt - tùy chọn)

// 2. Chân I2C (Khi chạy ở chế độ I2C Bus)
#define VL53L8CX_PIN_I2C_SDA 21  // ESP32 GPIO 21 -> Sensor SDA
#define VL53L8CX_PIN_I2C_SCL 22  // ESP32 GPIO 22 -> Sensor SCL

/**
 * Chiều cao lắp đặt cảm biến chuẩn (Base Height) = 222.0 cm (2220 mm: từ cảm biến trần xuống sàn)
 */
#define VL53L8CX_BASE_HEIGHT_MM 2220

/** Số vùng đo trong ma trận 8x8 */
#define VL53L8CX_ZONES 64

/** Byte Header nhận diện gói nhị phân thô 204 Bytes (tương thích ngược) */
#define VL53L8CX_FRAME_HEADER_0 0xAA
#define VL53L8CX_FRAME_HEADER_1 0x55
#define VL53L8CX_PACKET_SIZE    204

// ============================================================================
// ĐỊNH NGHĨA MÃ TRẠNG THÁI TARGET STATUS (ST Datasheet)
// ============================================================================
#define VL53L8CX_STATUS_VALID_100 5
#define VL53L8CX_STATUS_VALID_50  9
#define VL53L8CX_STATUS_INVALID   0

// ============================================================================
// CẤU TRÚC DỮ LIỆU & ENUM TRẠNG THÁI DRIVER
// ============================================================================

typedef enum {
    VL53L8CX_STATE_UNINITIALIZED = 0,
    VL53L8CX_STATE_INITIALIZING  = 1,
    VL53L8CX_STATE_RANGING       = 2,
    VL53L8CX_STATE_ERROR         = 3
} VL53L8CX_State;

typedef struct {
    uint32_t frameId;                     ///< Số thứ tự frame tăng dần (1, 2, 3...)
    uint32_t timestampMs;                 ///< Thời điểm đo tính từ lúc khởi động (milliseconds)
    uint16_t distances[VL53L8CX_ZONES];   ///< Mảng 64 khoảng cách (mm, từ 20mm đến 4000mm)
    uint8_t  targetStatuses[VL53L8CX_ZONES]; ///< Mảng 64 mã trạng thái độ tin cậy (5, 9, 0...)
    uint8_t  zoneCount;                   ///< Số lượng vùng đo (Cố định = 64)
    bool     isValid;                     ///< Cờ xác nhận dữ liệu hợp lệ & khớp checksum
} VL53L8CXFrame;

// Định danh tương thích để HeightEngine dùng chung cấu trúc frame 64 zones
typedef VL53L8CXFrame VL53L5CXFrame;

// ============================================================================
// LỚP ĐIỀU KHIỂN DRIVER C++ CHO VL53L8CX
// ============================================================================

class VL53L8CXDriver {
public:
    VL53L8CXDriver();
    ~VL53L8CXDriver();

    /**
     * Khởi tạo Driver VL53L8CX.
     * @param enableMockMode Nếu true, bật chế độ giả lập dữ liệu không cần cắm chip thật.
     * @param useSpiMode Nếu true, khởi tạo giao diện SPI 10MHz (mặc định true). Nếu false, khởi tạo I2C 1MHz.
     * @return true nếu khởi tạo thành công.
     */
    bool init(bool enableMockMode = false, bool useSpiMode = true);

    /** Bắt đầu đo liên tục ở tần số 15Hz (hoặc 30Hz) */
    bool startRanging();

    /** Dừng đo và giải phóng trạng thái */
    bool stopRanging();

    /** Lấy trạng thái hiện tại của Driver */
    VL53L8CX_State getState() const { return m_state; }

    /** Kiểm tra xem Driver có đang chạy ở chế độ Mock Mode hay không */
    bool isMockMode() const { return m_mockMode; }

    /** Kiểm tra xem đang kết nối qua bus SPI hay I2C */
    bool isSpiBus() const { return m_useSpi; }

    /**
     * Đọc 1 Frame dữ liệu mới nhất (từ cảm biến thật hoặc từ bộ sinh Mock).
     * @param frame Reference nhận dữ liệu trả về.
     * @return true nếu đọc thành công.
     */
    bool readFrame(VL53L8CXFrame& frame);

    /**
     * Sinh Frame dữ liệu giả lập mô phỏng người cao personHeightMm đứng bên dưới cảm biến trần.
     */
    VL53L8CXFrame generateMockFrame(uint32_t frameId, uint32_t timestampMs, uint16_t personHeightMm = 1700, uint16_t platformHeightMm = 0);

    /**
     * In log ma trận khoảng cách 8x8 trực quan ra cổng Serial.
     */
    static void printFrameLog(const VL53L8CXFrame& frame, uint16_t refHeightMm = VL53L8CX_BASE_HEIGHT_MM);

    /**
     * Đóng gói struct VL53L8CXFrame thành mảng byte nhị phân 204 Bytes để truyền qua Serial.
     */
    static size_t serializeFrame(const VL53L8CXFrame& frame, uint8_t* buffer, size_t maxLen);

    /**
     * Giải mã mảng byte nhị phân 204 Bytes nhận được từ Serial.
     */
    static bool deserializeFrame(const uint8_t* buffer, size_t len, VL53L8CXFrame& frame);

    /**
     * Tính toán mã kiểm tra lỗi CRC16-Modbus.
     */
    static uint16_t calculateCRC16(const uint8_t* data, size_t length);

    /**
     * Chuyển đổi tọa độ không gian đảo lăng kính Rx.
     */
    static void flipLensOrientation(const uint16_t src[VL53L8CX_ZONES], uint16_t dst[VL53L8CX_ZONES]);

    /** Thiết lập chiều cao chuẩn / khoảng cách thử nghiệm (mặc định 2220mm) */
    void setReferenceHeight(uint16_t heightMm) { m_ceilingHeightMm = heightMm; }
    uint16_t getReferenceHeight() const { return m_ceilingHeightMm; }

private:
    VL53L8CX_State m_state;
    bool           m_mockMode;
    bool           m_useSpi;
    uint32_t       m_frameCounter;
    uint16_t       m_ceilingHeightMm;
};

#endif // VL53L8CX_DRIVER_H
