/**
 * @file VL53L5CXDriver.h
 * @brief Header định nghĩa Driver C++ cho Cảm biến Khoảng cách Time-of-Flight STMicroelectronics VL53L5CX (8x8 Zones).
 *
 * Driver này chịu trách nhiệm:
 * 1. Khởi tạo & cấu hình cảm biến VL53L5CX (Chế độ 8x8 zones @ 15Hz).
 * 2. Hỗ trợ chế độ Giả lập (Mock Mode) sinh ma trận dữ liệu đỉnh đầu người đứng (~500mm) không cần phần cứng.
 * 3. Đóng gói dữ liệu nhị phân (Binary Protocol) 204 Bytes truyền qua USB Serial với kiểm tra mã CRC16-Modbus.
 * 4. Hỗ trợ câu lệnh Bắt tay Probe Handshake (PING 0xAA 0x55 'P' 'G' -> PONG 0xAA 0x55 'O' 'K').
 * 5. Đảo ngược tọa độ không gian thấu kính quang học Rx (Optical Lens Flipping).
 */

#ifndef VL53L5CX_DRIVER_H
#define VL53L5CX_DRIVER_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

// ============================================================================
// ĐỊNH NGHĨA CHÂN KẾT NỐI PHẦN CỨNG (HARDWARE PINOUT - ESP32 -> VL53L5CX)
// ============================================================================
#define VL53L5CX_PIN_SDA 21  // ESP32 GPIO 21 (D21) -> Sensor SDA
#define VL53L5CX_PIN_SCL 22  // ESP32 GPIO 22 (D22) -> Sensor SCL
#define VL53L5CX_PIN_LPN 4   // ESP32 GPIO 4  (D4)  -> Sensor LPN (Low Power Enable)
#define VL53L5CX_PIN_INT -1  // KHÔNG CẮM (-1)

/**
 * Chiều cao lắp đặt cảm biến chuẩn (Base Height) = 245.7 cm (2457 mm)
 */
#define VL53L5CX_BASE_HEIGHT_MM 2457

/** Số vùng đo trong ma trận 8x8 */
#define VL53L5CX_ZONES 64

/** Byte Header 0 nhận diện bắt đầu gói nhị phân */
#define VL53L5CX_FRAME_HEADER_0 0xAA

/** Byte Header 1 nhận diện bắt đầu gói nhị phân */
#define VL53L5CX_FRAME_HEADER_1 0x55

/** 
 * Tổng kích thước gói nhị phân cố định: 204 Bytes
 * Chi tiết: Header(2B) + FrameID(4B) + Timestamp(4B) + Distances(128B) + Statuses(64B) + CRC16(2B)
 */
#define VL53L5CX_PACKET_SIZE 204

// ============================================================================
// HẰNG SỐ CÂU LỆNH BẮT TAY PROBE HANDSHAKE (4 BYTES)
// ============================================================================

/** Lệnh PING gửi từ Kiosk xuống ESP32: 0xAA 0x55 0x50 0x47 ("PG") */
#define VL53L5CX_CMD_PING_BYTE_0 0xAA
#define VL53L5CX_CMD_PING_BYTE_1 0x55
#define VL53L5CX_CMD_PING_BYTE_2 0x50 // 'P'
#define VL53L5CX_CMD_PING_BYTE_3 0x47 // 'G'

/** Phản hồi PONG gửi từ ESP32 lên Kiosk: 0xAA 0x55 0x4F 0x4B ("OK") */
#define VL53L5CX_RESP_PONG_BYTE_0 0xAA
#define VL53L5CX_RESP_PONG_BYTE_1 0x55
#define VL53L5CX_RESP_PONG_BYTE_2 0x4F // 'O'
#define VL53L5CX_RESP_PONG_BYTE_3 0x4B // 'K'

// ============================================================================
// ĐỊNH NGHĨA MÃ TRẠNG THÁI TARGET STATUS (Theo ST Datasheet DS13754)
// ============================================================================

/** Tín hiệu phản xạ cực tốt, độ tin cậy 100% */
#define VL53L5CX_STATUS_VALID_100 5

/** Tín hiệu phản xạ trung bình (vùng rìa vai / tóc đen sẫm), độ tin cậy 50% */
#define VL53L5CX_STATUS_VALID_50  9

/** Tín hiệu nhiễu / không có phản xạ */
#define VL53L5CX_STATUS_INVALID   0

// ============================================================================
// CẤU TRÚC DỮ LIỆU & ENUM TRẠNG THÁI DRIVER
// ============================================================================

/** Enum quản lý trạng thái máy FSM của Driver */
typedef enum {
    VL53L5CX_STATE_UNINITIALIZED = 0, ///< Chưa khởi tạo
    VL53L5CX_STATE_INITIALIZING  = 1, ///< Đang khởi tạo bus I2C và cài đặt tham số
    VL53L5CX_STATE_RANGING       = 2, ///< Đang chạy liên tục ở tần số 15Hz
    VL53L5CX_STATE_ERROR         = 3  ///< Gặp lỗi phần cứng / không tìm thấy chip
} VL53L5CX_State;

/** Struct chứa toàn bộ dữ liệu của 1 Frame đo 64 vùng */
typedef struct {
    uint32_t frameId;                     ///< Số thứ tự frame tăng dần (1, 2, 3...)
    uint32_t timestampMs;                 ///< Thời điểm đo tính từ lúc khởi động (milliseconds)
    uint16_t distances[VL53L5CX_ZONES];   ///< Mảng 64 khoảng cách (mm, từ 20mm đến 4000mm)
    uint8_t  targetStatuses[VL53L5CX_ZONES]; ///< Mảng 64 mã trạng thái độ tin cậy (5, 9, 0...)
    uint8_t  zoneCount;                   ///< Số lượng vùng đo (Cố định = 64)
    bool     isValid;                     ///< Cờ xác nhận dữ liệu hợp lệ & khớp checksum
} VL53L5CXFrame;

// ============================================================================
// LỚP ĐIỀU KHIỂN DRIVER C++
// ============================================================================

class VL53L5CXDriver {
public:
    /** Constructor khởi tạo bộ đếm và trạng thái ban đầu */
    VL53L5CXDriver();

    /** Destructor dọn dẹp tài nguyên */
    ~VL53L5CXDriver();

    /**
     * Khởi tạo Driver.
     * @param enableMockMode Nếu true, bật chế độ giả lập dữ liệu người đứng mà không cần cắm chip thật.
     * @return true nếu khởi tạo thành công.
     */
    bool init(bool enableMockMode = false);

    /** Bắt đầu đo liên tục ở tần số 15Hz */
    bool startRanging();

    /** Dừng đo và giải phóng trạng thái */
    bool stopRanging();

    /** Lấy trạng thái hiện tại của Driver */
    VL53L5CX_State getState() const { return m_state; }

    /** Kiểm tra xem Driver có đang chạy ở chế độ Mock Mode hay không */
    bool isMockMode() const { return m_mockMode; }

    /**
     * Đọc 1 Frame dữ liệu mới nhất (từ phần cứng thật hoặc từ bộ sinh Mock).
     * @param frame Reference nhận dữ liệu trả về.
     * @return true nếu đọc thành công.
     */
    bool readFrame(VL53L5CXFrame& frame);

    /**
     * Sinh Frame dữ liệu giả lập mô phỏng người cao personHeightMm đứng bên dưới cảm biến trần.
     * @param frameId ID của frame
     * @param timestampMs Timestamp thời gian (ms)
     * @param personHeightMm Chiều cao mô phỏng của người (mm, mặc định 1700mm)
     * @return Dữ liệu VL53L5CXFrame đã được điền 64 zones.
     */
    VL53L5CXFrame generateMockFrame(uint32_t frameId, uint32_t timestampMs, uint16_t personHeightMm = 1700);

    /**
     * In log ma trận khoảng cách 8x8 trực quan ra cổng Serial (Human-readable ASCII Grid).
     * @param frame Frame chứa dữ liệu 64 vùng đo.
     * @param refHeightMm Chiều cao tham chiếu lắp đặt cảm biến (mặc định 2457mm)
     */
    static void printFrameLog(const VL53L5CXFrame& frame, uint16_t refHeightMm = VL53L5CX_BASE_HEIGHT_MM);

    /**
     * Đóng gói struct VL53L5CXFrame thành mảng byte nhị phân 204 Bytes để truyền qua Serial.
     * @param frame Dữ liệu frame vào
     * @param buffer Mảng byte nhận gói tin nhị phân
     * @param maxLen Độ dài tối đa của mảng (yêu cầu >= 204)
     * @return Kích thước thực tế đã đóng gói (204 bytes nếu thành công, 0 nếu lỗi)
     */
    static size_t serializeFrame(const VL53L5CXFrame& frame, uint8_t* buffer, size_t maxLen);

    /**
     * Giải mã mảng byte nhị phân 204 Bytes nhận được từ Serial thành struct VL53L5CXFrame.
     * @param buffer Mảng byte nhị phân đầu vào
     * @param len Độ dài mảng (yêu cầu >= 204)
     * @param frame Reference struct nhận dữ liệu giải mã
     * @return true nếu giải mã thành công và khớp mã CRC16 Modbus.
     */
    static bool deserializeFrame(const uint8_t* buffer, size_t len, VL53L5CXFrame& frame);

    /**
     * Tính toán mã kiểm tra lỗi CRC16-Modbus cho mảng dữ liệu byte.
     * @param data Mảng byte dữ liệu
     * @param length Độ dài tính toán (198 bytes dữ liệu trước checksum)
     * @return Giá trị CRC16 uint16_t
     */
    static uint16_t calculateCRC16(const uint8_t* data, size_t length);

    /**
     * Chuyển đổi tọa độ không gian đảo lăng kính Rx (Biến đổi Zone 0 góc trên-trái thành Zone 63 góc dưới-phải).
     * @param src Mảng 64 khoảng cách nguồn
     * @param dst Mảng 64 khoảng cách sau khi đảo lăng kính
     */
    static void flipLensOrientation(const uint16_t src[VL53L5CX_ZONES], uint16_t dst[VL53L5CX_ZONES]);

    /** Thiết lập chiều cao chuẩn / khoảng cách thử nghiệm (mặc định 2457mm) */
    void setReferenceHeight(uint16_t heightMm) { m_ceilingHeightMm = heightMm; }
    uint16_t getReferenceHeight() const { return m_ceilingHeightMm; }

private:
    VL53L5CX_State m_state;       ///< Trạng thái FSM của driver
    bool           m_mockMode;    ///< Cờ chạy mock mode
    uint32_t       m_frameCounter;///< Bộ đếm frame tự tăng
    uint16_t       m_ceilingHeightMm; ///< Chiều cao lắp đặt cảm biến (mặc định 2457mm)
};

#endif // VL53L5CX_DRIVER_H
