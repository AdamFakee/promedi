/**
 * @file HeightProtocol.h
 * @brief Định nghĩa giao thức nhị phân và cấu trúc dữ liệu cho Module Đo Chiều Cao ToF VL53L8CX.
 *
 * Giao thức truyền tin nhị phân siêu tinh gọn (Super-compact Binary Protocol):
 * - Chiều Kiosk -> ESP32: Lệnh PING, CONFIG, RESET, START, DEBUG
 * - Chiều ESP32 -> Kiosk: Gói Height Packet (16 Bytes) mang đầy đủ trạng thái, chiều cao cm,
 *   tiến trình ổn định progress 0-100%, mã hướng dẫn và sự kiện.
 */

#ifndef HEIGHT_PROTOCOL_H
#define HEIGHT_PROTOCOL_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// HẰNG SỐ MAGIC HEADER & PACKET SIZE
// ============================================================================
#define HEIGHT_MAGIC_BYTE_0         0xAA
#define HEIGHT_MAGIC_BYTE_1         0x55

/** Định danh loại gói tin: 'H' (0x48) = Height Result Packet */
#define HEIGHT_PACKET_TYPE          0x48

/** Tổng kích thước gói Height Packet cố định: 16 Bytes */
#define HEIGHT_PACKET_SIZE          16

/** Kích thước gói lệnh cấu hình CONFIG từ Kiosk xuống: 18 Bytes */
#define HEIGHT_CONFIG_CMD_SIZE      18

// ============================================================================
// HẰNG SỐ LỆNH ĐIỀU KHIỂN (KIOSK -> ESP32)
// ============================================================================
/** Lệnh PING: 0xAA 0x55 0x50 0x47 ("PG") */
#define CMD_PING_B2                 0x50 // 'P'
#define CMD_PING_B3                 0x47 // 'G'

/** Phản hồi PONG: 0xAA 0x55 0x4F 0x4B ("OK") */
#define RESP_PONG_B2                0x4F // 'O'
#define RESP_PONG_B3                0x4B // 'K'

/** Lệnh CONFIG: 0xAA 0x55 0x43 0x46 ("CF") */
#define CMD_CONFIG_B2               0x43 // 'C'
#define CMD_CONFIG_B3               0x46 // 'F'

/** Phản hồi CONFIG_OK: 0xAA 0x55 0x43 0x4B ("CK") */
#define RESP_CONFIG_OK_B2           0x43 // 'C'
#define RESP_CONFIG_OK_B3           0x4B // 'K'

/** Lệnh RESET: 0xAA 0x55 0x52 0x53 ("RS") */
#define CMD_RESET_B2                0x52 // 'R'
#define CMD_RESET_B3                0x53 // 'S'

/** Lệnh BẬT/TẮT DEBUG RAW 204B: 0xAA 0x55 0x44 0x42 ("DB") + 1 byte flag (1=ON, 0=OFF) */
#define CMD_DEBUG_RAW_B2            0x44 // 'D'
#define CMD_DEBUG_RAW_B3            0x42 // 'B'

// ============================================================================
// CÁC ENUM TRẠNG THÁI & HƯỚNG DẪN (ĐỒNG BỘ 100% VỚI KIOSK APP)
// ============================================================================

/** Enum trạng thái FSM của Engine đo chiều cao */
typedef enum {
    HEIGHT_STATE_IDLE               = 0, ///< Sẵn sàng / Chưa có người
    HEIGHT_STATE_MEASURING          = 1, ///< Đang phân tích tín hiệu
    HEIGHT_STATE_HOLD_STILL         = 2, ///< Phát hiện người, yêu cầu đứng yên
    HEIGHT_STATE_LOCKED             = 3, ///< Đã chốt khóa chiều cao thành công
    HEIGHT_STATE_TIMEOUT            = 4, ///< Quá thời gian đo (15s)
    HEIGHT_STATE_ERROR              = 5  ///< Lỗi cảm biến
} HeightEngineState;

/** Enum mã hướng dẫn hành động tương tác (Guidance Code) */
typedef enum {
    HEIGHT_GUIDE_IDLE               = 0, ///< Sẵn sàng đo chiều cao
    HEIGHT_GUIDE_STEP_ON            = 1, ///< Mời bước lên bàn cân
    HEIGHT_GUIDE_HOLD_STILL         = 2, ///< Vui lòng đứng thẳng và đứng yên
    HEIGHT_GUIDE_MEASURING          = 3, ///< Đang phân tích tín hiệu đo
    HEIGHT_GUIDE_LOCKED             = 4, ///< Đã hoàn thành đo chiều cao
    HEIGHT_GUIDE_TIMEOUT            = 5  ///< Quá thời gian đo
} HeightGuidanceCode;

/** Enum sự kiện đặc biệt (Events) phát cho FSM điều phối */
typedef enum {
    HEIGHT_EVENT_NONE               = 0,
    HEIGHT_EVENT_PERSON_PRESENT     = 1, ///< Người vừa bước vào vùng đo
    HEIGHT_EVENT_LOCKED             = 2, ///< Đã khóa chiều cao thành công
    HEIGHT_EVENT_PERSON_LEFT        = 3, ///< Người đã bước ra khỏi sàn
    HEIGHT_EVENT_TIMEOUT            = 4  ///< Hết thời gian chờ 15s
} HeightEngineEvent;

// ============================================================================
// CẤU TRÚC GÓI KẾT QUẢ CHIỀU CAO (HEIGHT PACKET - 16 BYTES)
// ============================================================================
#pragma pack(push, 1)

/**
 * Gói tin kết quả đo chiều cao nhị phân 16 Bytes truyền từ ESP32 lên Kiosk.
 * Toàn bộ số nguyên đa-byte mã hóa Little-Endian.
 */
typedef struct {
    uint8_t  header0;          ///< 0xAA
    uint8_t  header1;          ///< 0x55
    uint8_t  packetType;       ///< 'H' (0x48)
    uint8_t  state;            ///< HeightEngineState (0: IDLE, 1: MEASURING, 2: HOLD_STILL, 3: LOCKED, 4: TIMEOUT)
    uint8_t  guidance;         ///< HeightGuidanceCode (0: IDLE, 1: STEP_ON, 2: HOLD_STILL, ...)
    uint16_t lockedHeightMm;   ///< Chiều cao chốt (mm, ví dụ: 1725 = 172.5cm, 0 nếu chưa locked)
    uint16_t instantHeightMm;  ///< Chiều cao tức thời (mm)
    uint8_t  progress;         ///< Tiến trình ổn định (0 - 100 %)
    uint8_t  confidence;       ///< Độ tin cậy tính toán (0 - 100 %)
    uint8_t  headZoneCount;    ///< Số zone trong dải đỉnh đầu
    uint8_t  eventCode;        ///< HeightEngineEvent (0: NONE, 1: PERSON_PRESENT, 2: LOCKED, 3: LEFT, 4: TIMEOUT)
    uint8_t  flags;            ///< Bit 0: isStable, Bit 1: hasPerson, Bit 2: needsRecalibration
    uint16_t checksumCrc16;    ///< CRC16-Modbus tính trên 14 bytes đầu tiên
} HeightPacketPayload;

/**
 * Cấu hình tham số đo chiều cao gửi từ Kiosk xuống ESP32.
 */
typedef struct {
    uint16_t expectedFloorMm;  ///< Chiều cao từ cảm biến trần xuống sàn (mặc định 2220 mm)
    uint16_t platformHeightMm; ///< Độ cao bệ cân InBody (mặc định 96 mm)
    float    gainScale;        ///< Hệ số tỉ lệ hiệu chuẩn quang học (mặc định 1.0f)
    float    offsetMm;         ///< Hằng số bù trừ mm (mặc định 0.0f)
    uint16_t minPersonMm;      ///< Chiều cao tối thiểu nhận diện người (mặc định 900 mm)
} HeightEngineConfig;

#pragma pack(pop)

#ifdef __cplusplus
}
#endif

#endif // HEIGHT_PROTOCOL_H
