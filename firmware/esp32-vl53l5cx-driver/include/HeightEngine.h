/**
 * @file HeightEngine.h
 * @brief Header định nghĩa Engine Tính Toán Chiều Cao C++ chạy trực tiếp trên Vi Điều Khiển ESP32.
 *
 * Chuyển đổi toàn bộ 8 bước xử lý toán học từ TypeScript (height-measurement.engine.ts) xuống firmware C++:
 * 1. Bù góc cosθ Spatial Transform theo thấu kính 8x8.
 * 2. Trừ Baseline (Trần 2220mm - Bệ cân 96mm).
 * 3. Nhận diện người (Core Zones hàng 2..5, cột 2..5 & Chiều cao >= 900mm).
 * 4. Lọc dải đỉnh đầu Top 3 Zones (Band 80mm).
 * 5. Lọc nhiễu nhảy vọt Glitch (Jump > 60mm).
 * 6. Lọc ngoại lai thống kê MAD (Median Absolute Deviation) trên cửa sổ trượt.
 * 7. Đánh giá ổn định (Biên độ Range <= 10mm, Vận tốc đứng |Slope| <= 6mm/s, Đứng yên Hold >= 1s).
 * 8. Chốt kết quả Trimmed Mean 10% và phát gói nhị phân 16 Bytes.
 */

#ifndef HEIGHT_ENGINE_H
#define HEIGHT_ENGINE_H

#include "HeightProtocol.h"
#include "VL53L5CXDriver.h"
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/** Dung lượng tối đa của bộ đệm trượt lịch sử (Circular Buffer): 60 mẫu (~4 giây ở tần số 15Hz) */
#define HEIGHT_HISTORY_CAPACITY 60

/** Mẫu độ cao theo thời gian lưu trong Sliding Window */
typedef struct {
    uint32_t timestampMs;
    float    heightMm;
} HeightSample;

class HeightEngine {
public:
    HeightEngine();
    ~HeightEngine();

    /**
     * Khởi tạo các bảng tra cứu (LUT) và nạp cấu hình mặc định.
     */
    void init();

    /**
     * Cập nhật tham số cấu hình đo (chiều cao trần, độ cao bệ cân, gain, offset).
     */
    void setConfig(const HeightEngineConfig& cfg);

    /** Lấy cấu hình hiện tại */
    const HeightEngineConfig& getConfig() const { return m_cfg; }

    /**
     * Reset toàn bộ trạng thái FSM, xóa bộ đệm lịch sử về IDLE.
     */
    void reset();

    /**
     * Đẩy 1 frame thô từ cảm biến vào pipeline 8 bước xử lý toán học.
     * @param frame Frame 64 zones nhận từ VL53L5CXDriver
     * @return HeightPacketPayload chứa đầy đủ kết quả chiều cao, trạng thái và cờ sự kiện.
     */
    HeightPacketPayload push(const VL53L5CXFrame& frame);

    /**
     * Đóng gói struct HeightPacketPayload thành mảng nhị phân 16 Bytes gửi qua Serial.
     * @param payload Dữ liệu kết quả vào
     * @param buffer Mảng byte nhận kết quả (tối thiểu 16 bytes)
     * @param maxLen Kích thước mảng đệm
     * @return 16 nếu thành công, 0 nếu thất bại.
     */
    static size_t serializePacket(const HeightPacketPayload& payload, uint8_t* buffer, size_t maxLen);

    /**
     * Giải mã mảng nhị phân 16 Bytes nhận được từ Serial thành struct HeightPacketPayload.
     * @param buffer Mảng byte đầu vào
     * @param len Kích thước mảng (yêu cầu >= 16)
     * @param payload Struct nhận dữ liệu giải mã
     * @return true nếu giải mã thành công và khớp mã kiểm tra lỗi CRC16 Modbus.
     */
    static bool deserializePacket(const uint8_t* buffer, size_t len, HeightPacketPayload& payload);

    /**
     * Tính toán mã kiểm tra lỗi CRC16-Modbus.
     */
    static uint16_t calculateCRC16(const uint8_t* data, size_t length);

    /**
     * In log ma trận chiều cao 8x8 trực quan (Human-readable ASCII Grid) ra cổng Serial.
     * @param frame Dữ liệu 64 vùng đo
     * @param cfg Cấu hình đo (chiều cao trần, bệ cân...)
     * @param payload Kết quả tính toán từ HeightEngine
     */
    static void printHeightMatrixLog(const VL53L5CXFrame& frame, const HeightEngineConfig& cfg, const HeightPacketPayload& payload);

private:
    // Cấu hình tham số
    HeightEngineConfig m_cfg;

    // Bảng lượng giác cos(theta) bù góc không gian cho 64 zones (8x8)
    float m_cosLUT[8][8];

    // Trạng thái FSM
    HeightEngineState  m_state;
    HeightGuidanceCode m_guidance;
    bool               m_locked;
    bool               m_timeoutTriggered;
    uint32_t           m_sessionStartMs;
    bool               m_hasSession;

    // Bộ đếm nhận diện người
    uint16_t m_hitCount;
    uint16_t m_missCount;
    uint16_t m_glitchCount;

    // Bộ theo dõi nhảy bước
    float    m_prevHeightMm;
    bool     m_hasPrevHeight;
    uint32_t m_lastTimestampMs;
    float    m_lastProgress;

    // Kết quả chốt
    uint16_t m_lockedHeightMm;
    uint8_t  m_lockedConfidence;

    // Bộ đệm trượt lịch sử (Circular Buffer tĩnh, zero dynamic heap allocation)
    HeightSample m_history[HEIGHT_HISTORY_CAPACITY];
    int          m_historyCount;
    int          m_historyHead;

    // Phương thức nội bộ
    void  initCosLUT();
    float calculateMedian(float* arr, int n);
    float calculateSlope(const HeightSample* samples, int count);
    bool  checkTimeout(uint32_t currentTs);
    void  pushSample(uint32_t ts, float h);
    void  pruneHistory(uint32_t cutoffTs);
    int   copyRecentSamples(HeightSample* dst, int maxDst) const;
};

#endif // HEIGHT_ENGINE_H
