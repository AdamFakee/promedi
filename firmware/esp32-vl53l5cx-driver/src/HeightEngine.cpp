/**
 * @file HeightEngine.cpp
 * @brief Hiện thực hóa Engine Tính Toán Chiều Cao C++ tối ưu trên vi điều khiển ESP32.
 */

#include "HeightEngine.h"
#include <string.h>
#include <math.h>

#ifdef ARDUINO
#include <Arduino.h>
#endif

// ============================================================================
// CONSTRUCTOR & DESTRUCTOR
// ============================================================================

HeightEngine::HeightEngine() {
    m_cfg.expectedFloorMm = 2220;
    m_cfg.platformHeightMm = 0;
    m_cfg.gainScale = 1.0f;
    m_cfg.offsetMm = 0.0f;
    m_cfg.minPersonMm = 900;

    init();
}

HeightEngine::~HeightEngine() {
}

// ============================================================================
// KHỞI TẠO & CẤU HÌNH
// ============================================================================

void HeightEngine::init() {
    initCosLUT();
    reset();
}

void HeightEngine::initCosLUT() {
    // Góc bước thấu kính ST VL53L5CX: 45 độ chia cho 8 vùng (khoảng 5.625 độ / zone)
    const float stepRad = (45.0f / 8.0f) * (3.141592653589793f / 180.0f);
    float tanTable[8];
    for (int i = 0; i < 8; i++) {
        tanTable[i] = tanf((((float)i) - 3.5f) * stepRad);
    }
    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 8; c++) {
            m_cosLUT[r][c] = 1.0f / sqrtf(1.0f + tanTable[c] * tanTable[c] + tanTable[r] * tanTable[r]);
        }
    }
}

void HeightEngine::setConfig(const HeightEngineConfig& cfg) {
    m_cfg = cfg;
    // Giới hạn an toàn các tham số cấu hình
    if (m_cfg.expectedFloorMm < 1000) m_cfg.expectedFloorMm = 2220;
    if (m_cfg.gainScale <= 0.0f) m_cfg.gainScale = 1.0f;
    if (m_cfg.minPersonMm < 300) m_cfg.minPersonMm = 900;
}

void HeightEngine::reset() {
    m_state = HEIGHT_STATE_IDLE;
    m_guidance = HEIGHT_GUIDE_IDLE;
    m_locked = false;
    m_timeoutTriggered = false;
    m_sessionStartMs = 0;
    m_hasSession = false;

    m_hitCount = 0;
    m_missCount = 0;
    m_glitchCount = 0;

    m_prevHeightMm = 0.0f;
    m_hasPrevHeight = false;
    m_lastTimestampMs = 0;
    m_lastProgress = 0.0f;

    m_lockedHeightMm = 0;
    m_lockedConfidence = 0;

    m_historyCount = 0;
    m_historyHead = 0;
}

// ============================================================================
// QUẢN LÝ CIRCULAR BUFFER LỊCH SỬ (SLIDING WINDOW)
// ============================================================================

void HeightEngine::pushSample(uint32_t ts, float h) {
    m_history[m_historyHead].timestampMs = ts;
    m_history[m_historyHead].heightMm = h;

    m_historyHead = (m_historyHead + 1) % HEIGHT_HISTORY_CAPACITY;
    if (m_historyCount < HEIGHT_HISTORY_CAPACITY) {
        m_historyCount++;
    }
}

void HeightEngine::pruneHistory(uint32_t cutoffTs) {
    if (m_historyCount == 0) return;

    // Thu thập các mẫu hợp lệ còn nằm trong cửa sổ [cutoffTs, now]
    HeightSample temp[HEIGHT_HISTORY_CAPACITY];
    int validCount = 0;

    // Đọc từ mẫu cũ nhất tới mẫu mới nhất
    int startIdx = (m_historyHead - m_historyCount + HEIGHT_HISTORY_CAPACITY) % HEIGHT_HISTORY_CAPACITY;
    for (int i = 0; i < m_historyCount; i++) {
        int idx = (startIdx + i) % HEIGHT_HISTORY_CAPACITY;
        if (m_history[idx].timestampMs >= cutoffTs) {
            temp[validCount++] = m_history[idx];
        }
    }

    // Sao chép lại vào mảng chính
    for (int i = 0; i < validCount; i++) {
        m_history[i] = temp[i];
    }
    m_historyCount = validCount;
    m_historyHead = validCount % HEIGHT_HISTORY_CAPACITY;
}

int HeightEngine::copyRecentSamples(HeightSample* dst, int maxDst) const {
    int count = (m_historyCount < maxDst) ? m_historyCount : maxDst;
    int startIdx = (m_historyHead - m_historyCount + HEIGHT_HISTORY_CAPACITY) % HEIGHT_HISTORY_CAPACITY;
    for (int i = 0; i < count; i++) {
        int idx = (startIdx + i) % HEIGHT_HISTORY_CAPACITY;
        dst[i] = m_history[idx];
    }
    return count;
}

// ============================================================================
// HÀM TIỆN ÍCH TOÁN HỌC (MEDIAN, LINEAR REGRESSION SLOPE)
// ============================================================================

static void insertionSortFloats(float* arr, int n) {
    for (int i = 1; i < n; i++) {
        float key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

float HeightEngine::calculateMedian(float* arr, int n) {
    if (n <= 0) return 0.0f;
    insertionSortFloats(arr, n);
    int mid = n / 2;
    if (n % 2 != 0) {
        return arr[mid];
    }
    return (arr[mid - 1] + arr[mid]) * 0.5f;
}

float HeightEngine::calculateSlope(const HeightSample* samples, int count) {
    if (count < 2) return 0.0f;

    double sumT = 0.0;
    double sumH = 0.0;
    for (int i = 0; i < count; i++) {
        sumT += (double)samples[i].timestampMs;
        sumH += (double)samples[i].heightMm;
    }

    double avgT = sumT / (double)count;
    double avgH = sumH / (double)count;

    double num = 0.0;
    double den = 0.0;
    for (int i = 0; i < count; i++) {
        double dt = (double)samples[i].timestampMs - avgT;
        double dh = (double)samples[i].heightMm - avgH;
        num += dt * dh;
        den += dt * dt;
    }

    if (den == 0.0) return 0.0f;
    return (float)(num / den); // mm / ms
}

bool HeightEngine::checkTimeout(uint32_t currentTs) {
    if (m_hasSession && (currentTs - m_sessionStartMs > 15000)) { // 15 giây timeout
        m_timeoutTriggered = true;
        m_state = HEIGHT_STATE_TIMEOUT;
        m_guidance = HEIGHT_GUIDE_TIMEOUT;
        return true;
    }
    return false;
}

// ============================================================================
// PIPELINE 8 BƯỚC TÍNH TOÁN CHIỀU CAO (CORE ENGINE)
// ============================================================================

HeightPacketPayload HeightEngine::push(const VL53L5CXFrame& frame) {
    HeightPacketPayload out;
    memset(&out, 0, sizeof(out));
    out.header0 = HEIGHT_MAGIC_BYTE_0;
    out.header1 = HEIGHT_MAGIC_BYTE_1;
    out.packetType = HEIGHT_PACKET_TYPE;

    if (!frame.isValid) {
        out.state = HEIGHT_STATE_ERROR;
        out.guidance = HEIGHT_GUIDE_IDLE;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 1. Kiểm tra đứt đoạn thời gian (gap check > 300ms)
    if (m_lastTimestampMs > 0) {
        if (frame.timestampMs < m_lastTimestampMs || (frame.timestampMs - m_lastTimestampMs > 300)) {
            m_historyCount = 0;
            m_historyHead = 0;
            m_hasPrevHeight = false;
        }
    }
    m_lastTimestampMs = frame.timestampMs;

    HeightEngineEvent pendingEvent = HEIGHT_EVENT_NONE;

    // 2. Chuyển đổi tọa độ không gian thấu kính & xây dựng Height Map cho ROI (hàng 1..6, cột 1..6)
    struct ZoneItem {
        float   h;
        uint8_t status;
        int     r;
        int     c;
    };
    ZoneItem validZones[64];
    int validCount = 0;
    float peakH = 0.0f;

    for (int r = 1; r <= 6; r++) {
        for (int c = 1; c <= 6; c++) {
            int i = r * 8 + c;
            uint8_t st = frame.targetStatuses[i];
            // Mở rộng status chấp nhận được (5, 6, 9, 10, 11, 12, 13)
            if (st < 5 || st > 13 || st == 7 || st == 8) continue;

            uint16_t d = frame.distances[i];
            if (d <= 50 || d >= 3900) continue;

            float z = ((float)d) * m_cosLUT[r][c];
            float floorZ = (float)m_cfg.expectedFloorMm;
            float h = floorZ - z - ((float)m_cfg.platformHeightMm);
            if (h < 0.0f) h = 0.0f;

            validZones[validCount].h = h;
            validZones[validCount].status = st;
            validZones[validCount].r = r;
            validZones[validCount].c = c;
            if (h > peakH) {
                peakH = h;
            }
            validCount++;
        }
    }

    // 3. Nhận diện sự hiện diện của Người (Person Detection)
    // Gom các zone trong dải đỉnh đầu [peakH - 80mm, peakH]
    ZoneItem bandZones[64];
    int bandCount = 0;
    for (int i = 0; i < validCount; i++) {
        if (validZones[i].h >= (peakH - 80.0f)) {
            bandZones[bandCount++] = validZones[i];
        }
    }

    // Kiểm tra xem trong dải đỉnh đầu có zone nào thuộc vùng trung tâm bàn cân (hàng 2..5, cột 2..5)
    bool hasCorePeak = false;
    for (int i = 0; i < bandCount; i++) {
        if (bandZones[i].r >= 2 && bandZones[i].r <= 5 &&
            bandZones[i].c >= 2 && bandZones[i].c <= 5) {
            hasCorePeak = true;
            break;
        }
    }

    bool hasPerson = (peakH >= (float)m_cfg.minPersonMm) && hasCorePeak;

    // 4. Quản lý trạng thái đã LOCKED trước đó
    if (m_locked) {
        if (!hasPerson) {
            m_missCount++;
            if (m_missCount >= 15) { // Người đã bước xuống cân (~1s)
                pendingEvent = HEIGHT_EVENT_PERSON_LEFT;
                reset();
                out.state = HEIGHT_STATE_IDLE;
                out.guidance = HEIGHT_GUIDE_STEP_ON;
                out.eventCode = pendingEvent;
                out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
                return out;
            }
        } else {
            m_missCount = 0;
        }

        out.state = HEIGHT_STATE_LOCKED;
        out.guidance = HEIGHT_GUIDE_LOCKED;
        out.lockedHeightMm = m_lockedHeightMm;
        out.instantHeightMm = m_lockedHeightMm;
        out.progress = 100;
        out.confidence = m_lockedConfidence;
        out.flags = 0x03; // isStable | hasPerson
        out.eventCode = HEIGHT_EVENT_NONE;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 5. Quản lý trạng thái TIMEOUT
    if (m_timeoutTriggered) {
        if (!hasPerson) {
            m_missCount++;
            if (m_missCount >= 15) {
                pendingEvent = HEIGHT_EVENT_PERSON_LEFT;
                reset();
                out.state = HEIGHT_STATE_IDLE;
                out.guidance = HEIGHT_GUIDE_STEP_ON;
                out.eventCode = pendingEvent;
                out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
                return out;
            }
        } else {
            m_missCount = 0;
        }

        out.state = HEIGHT_STATE_TIMEOUT;
        out.guidance = HEIGHT_GUIDE_TIMEOUT;
        out.progress = (uint8_t)(m_lastProgress * 100.0f);
        out.flags = hasPerson ? 0x02 : 0x00;
        out.eventCode = HEIGHT_EVENT_NONE;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 6. Xử lý khi KHÔNG có người
    if (!hasPerson) {
        m_missCount++;
        m_hitCount = 0;

        if (m_missCount >= 15) {
            if (m_hasSession) {
                pendingEvent = HEIGHT_EVENT_PERSON_LEFT;
            }
            reset();
            out.state = HEIGHT_STATE_IDLE;
            out.guidance = HEIGHT_GUIDE_STEP_ON;
            out.eventCode = pendingEvent;
            out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
            return out;
        }

        if (!m_hasSession) {
            out.state = HEIGHT_STATE_IDLE;
            out.guidance = HEIGHT_GUIDE_STEP_ON;
            out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
            return out;
        }

        out.state = HEIGHT_STATE_MEASURING;
        out.guidance = HEIGHT_GUIDE_MEASURING;
        out.progress = (uint8_t)(m_lastProgress * 100.0f);
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 7. Xử lý khi CÓ người đứng vào bàn cân
    m_missCount = 0;
    m_hitCount++;

    // Xác nhận người xuất hiện sau 6 frames (~400ms)
    if (m_hitCount == 6 && !m_hasSession) {
        m_sessionStartMs = frame.timestampMs;
        m_hasSession = true;
        pendingEvent = HEIGHT_EVENT_PERSON_PRESENT;
        // Xóa sạch bộ đệm lịch sử để đo sạch sẽ từ thời điểm người bắt đầu đứng yên
        m_historyCount = 0;
        m_historyHead = 0;
        m_prevHeightMm = 0.0f;
        m_hasPrevHeight = false;
    }

    if (m_hitCount < 6) {
        out.state = m_hasSession ? HEIGHT_STATE_MEASURING : HEIGHT_STATE_IDLE;
        out.guidance = m_hasSession ? HEIGHT_GUIDE_MEASURING : HEIGHT_GUIDE_STEP_ON;
        out.flags = 0x02; // hasPerson
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 8. Trích xuất đỉnh đầu (Crown / Vertex Peak Extraction):
    // Sắp xếp giảm dần bandZones theo chiều cao
    for (int i = 1; i < bandCount; i++) {
        ZoneItem key = bandZones[i];
        int j = i - 1;
        while (j >= 0 && bandZones[j].h < key.h) {
            bandZones[j + 1] = bandZones[j];
            j--;
        }
        bandZones[j + 1] = key;
    }

    // Đề phòng trường hợp 1 zone bị nhiễu quang học vọt lên (Spike trên tóc đen)
    // Nếu zone cao nhất chênh lệch > 15mm so với zone thứ 2, kẹp lại để chống spike
    if (bandCount >= 2 && (bandZones[0].h - bandZones[1].h > 15.0f)) {
        bandZones[0].h = bandZones[1].h + 5.0f;
    }

    // Tính instantH theo trọng số đỉnh vòm sọ:
    // Zone 0: trọng số 60%
    // Zone 1: trọng số 25% (nếu nằm trong khoảng 25mm so với Zone 0)
    // Zone 2: trọng số 15% (nếu nằm trong khoảng 25mm so với Zone 0)
    // Tránh cào bằng các zone sườn đầu thấp hơn gây tụt chiều cao khi lệch tâm ô
    float h0 = bandZones[0].h;
    float sumWeightedH = h0 * 0.60f;
    float sumWeights = 0.60f;
    uint8_t headZones = 1;

    if (bandCount >= 2 && (h0 - bandZones[1].h <= 25.0f)) {
        sumWeightedH += bandZones[1].h * 0.25f;
        sumWeights += 0.25f;
        headZones++;
    }
    if (bandCount >= 3 && (h0 - bandZones[2].h <= 25.0f)) {
        sumWeightedH += bandZones[2].h * 0.15f;
        sumWeights += 0.15f;
        headZones++;
    }

    float instantH = sumWeightedH / sumWeights;

    // 9. Bộ lọc nhiễu nhảy vọt (Glitch Filter)
    bool isGlitch = false;
    if (bandCount < 2) {
        isGlitch = true; // Tia nhọn đơn lẻ (Spike)
    } else if (instantH < 800.0f || instantH > 2300.0f) {
        isGlitch = true; // Ngoài dải chiều cao con người (Out of range)
    } else if (m_hasPrevHeight && fabsf(instantH - m_prevHeightMm) > 60.0f) {
        isGlitch = true; // Nhảy vọt quá 6cm trong 66ms (Optical Jump)
    }

    m_prevHeightMm = instantH;
    m_hasPrevHeight = true;

    if (isGlitch) {
        m_glitchCount++;
        if (m_glitchCount > 3) {
            m_historyCount = 0;
            m_historyHead = 0;
        }

        if (checkTimeout(frame.timestampMs)) {
            out.state = HEIGHT_STATE_TIMEOUT;
            out.guidance = HEIGHT_GUIDE_TIMEOUT;
            out.eventCode = HEIGHT_EVENT_TIMEOUT;
            out.flags = 0x02;
            out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
            return out;
        }

        out.state = HEIGHT_STATE_MEASURING;
        out.guidance = HEIGHT_GUIDE_HOLD_STILL;
        out.instantHeightMm = (uint16_t)roundf(instantH);
        out.headZoneCount = headZones;
        out.progress = (uint8_t)(m_lastProgress * 100.0f);
        out.flags = 0x02;
        out.eventCode = pendingEvent;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    m_glitchCount = 0;

    // 10. Đẩy mẫu vào Cửa sổ trượt (Sliding Window 2500ms)
    pushSample(frame.timestampMs, instantH);
    uint32_t cutoffTs = (frame.timestampMs > 2500) ? (frame.timestampMs - 2500) : 0;
    pruneHistory(cutoffTs);

    // 11. Bộ lọc ngoại lai thống kê MAD (Median Absolute Deviation)
    HeightSample sampleBuf[HEIGHT_HISTORY_CAPACITY];
    int n = copyRecentSamples(sampleBuf, HEIGHT_HISTORY_CAPACITY);

    float heights[HEIGHT_HISTORY_CAPACITY];
    for (int i = 0; i < n; i++) {
        heights[i] = sampleBuf[i].heightMm;
    }

    float med = calculateMedian(heights, n);

    float devs[HEIGHT_HISTORY_CAPACITY];
    for (int i = 0; i < n; i++) {
        devs[i] = fabsf(sampleBuf[i].heightMm - med);
    }

    float mad = calculateMedian(devs, n);
    if (mad < 3.0f) mad = 3.0f; // Ngưỡng sàn MAD

    HeightSample keptSamples[HEIGHT_HISTORY_CAPACITY];
    float keptH[HEIGHT_HISTORY_CAPACITY];
    int keptCount = 0;

    for (int i = 0; i < n; i++) {
        if (fabsf(sampleBuf[i].heightMm - med) <= (3.0f * mad)) {
            keptSamples[keptCount] = sampleBuf[i];
            keptH[keptCount] = sampleBuf[i].heightMm;
            keptCount++;
        }
    }

    // Yêu cầu giữ lại ít nhất 70% mẫu
    if (keptCount < (int)(0.70f * ((float)n))) {
        if (checkTimeout(frame.timestampMs)) {
            out.state = HEIGHT_STATE_TIMEOUT;
            out.guidance = HEIGHT_GUIDE_TIMEOUT;
            out.eventCode = HEIGHT_EVENT_TIMEOUT;
            out.flags = 0x02;
            out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
            return out;
        }

        m_lastProgress = 0.3f;
        out.state = HEIGHT_STATE_MEASURING;
        out.guidance = HEIGHT_GUIDE_HOLD_STILL;
        out.instantHeightMm = (uint16_t)roundf(instantH);
        out.headZoneCount = headZones;
        out.progress = 30;
        out.flags = 0x02;
        out.eventCode = pendingEvent;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // 12. Đánh giá Tiêu chuẩn Ổn định (Stability Criteria)
    float minH = keptH[0];
    float maxH = keptH[0];
    for (int i = 1; i < keptCount; i++) {
        if (keptH[i] < minH) minH = keptH[i];
        if (keptH[i] > maxH) maxH = keptH[i];
    }
    float range = maxH - minH;

    float slope = calculateSlope(keptSamples, keptCount) * 1000.0f; // mm/giây
    uint32_t holdMs = keptSamples[keptCount - 1].timestampMs - keptSamples[0].timestampMs;

    // Tiêu chuẩn ổn định thực tế: Biên độ rung lắc <= 12mm (1.2cm) và vận tốc đứng |slope| <= 6mm/s
    if (range > 12.0f || fabsf(slope) > 6.0f) {
        float progress = 1.0f - (range / 40.0f);
        if (progress > 0.4f) progress = 0.4f;
        if (progress < 0.1f) progress = 0.1f;
        m_lastProgress = progress;

        if (checkTimeout(frame.timestampMs)) {
            out.state = HEIGHT_STATE_TIMEOUT;
            out.guidance = HEIGHT_GUIDE_TIMEOUT;
            out.eventCode = HEIGHT_EVENT_TIMEOUT;
            out.flags = 0x02;
            out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
            return out;
        }

        out.state = HEIGHT_STATE_HOLD_STILL;
        out.guidance = HEIGHT_GUIDE_HOLD_STILL;
        out.instantHeightMm = (uint16_t)roundf(instantH);
        out.headZoneCount = headZones;
        out.progress = (uint8_t)(progress * 100.0f);
        out.flags = 0x02;
        out.eventCode = pendingEvent;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    // Khi người dùng đã đứng yên trong dải 12mm: Tiến trình tăng mượt từ 40% đến 99% theo thời gian holdMs (0..2000ms)
    float progressRatio = ((float)holdMs) / 2000.0f;
    if (progressRatio > 1.0f) progressRatio = 1.0f;

    float progress = 0.40f + progressRatio * 0.59f;
    if (progress > 0.99f) progress = 0.99f;
    m_lastProgress = progress;

    // 13. CHỐT KHÓA CHIỀU CAO (HEIGHT LOCK)
    // Người dùng đứng yên liên tục holdMs >= 2000ms (2.0 giây) và có tối thiểu 16 mẫu hợp lệ
    if (holdMs >= 2000 && keptCount >= 16) {
        // Sắp xếp các mẫu đã ổn định tăng dần
        insertionSortFloats(keptH, keptCount);

        // Cắt bỏ 10% biên trên và 10% biên dưới (Trimmed Mean 10%)
        int trim = (int)(0.1f * ((float)keptCount));
        int sliceStart = trim;
        int sliceEnd = keptCount - trim;
        if (sliceStart >= sliceEnd) {
            sliceStart = 0;
            sliceEnd = keptCount;
        }

        float sumTrimmed = 0.0f;
        int countTrimmed = 0;
        for (int i = sliceStart; i < sliceEnd; i++) {
            sumTrimmed += keptH[i];
            countTrimmed++;
        }
        float rawMm = (countTrimmed > 0) ? (sumTrimmed / (float)countTrimmed) : instantH;

        // Bù trừ tỉ lệ Gain Scale và Offset Mm
        float finalMm = rawMm * m_cfg.gainScale + m_cfg.offsetMm;
        m_lockedHeightMm = (uint16_t)roundf(finalMm);

        // Tính toán độ tin cậy confidence
        float conf = 1.0f - (range / 15.0f);
        if (conf > 0.99f) conf = 0.99f;
        if (conf < 0.85f) conf = 0.85f;
        m_lockedConfidence = (uint8_t)(conf * 100.0f);

        m_locked = true;
        m_state = HEIGHT_STATE_LOCKED;
        m_guidance = HEIGHT_GUIDE_LOCKED;
        pendingEvent = HEIGHT_EVENT_LOCKED;

        out.state = HEIGHT_STATE_LOCKED;
        out.guidance = HEIGHT_GUIDE_LOCKED;
        out.lockedHeightMm = m_lockedHeightMm;
        out.instantHeightMm = (uint16_t)roundf(instantH);
        out.progress = 100;
        out.confidence = m_lockedConfidence;
        out.headZoneCount = headZones;
        out.flags = 0x03; // isStable | hasPerson
        out.eventCode = pendingEvent;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    if (checkTimeout(frame.timestampMs)) {
        out.state = HEIGHT_STATE_TIMEOUT;
        out.guidance = HEIGHT_GUIDE_TIMEOUT;
        out.eventCode = HEIGHT_EVENT_TIMEOUT;
        out.flags = 0x02;
        out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
        return out;
    }

    out.state = HEIGHT_STATE_MEASURING;
    out.guidance = HEIGHT_GUIDE_HOLD_STILL;
    out.instantHeightMm = (uint16_t)roundf(instantH);
    out.headZoneCount = headZones;
    out.progress = (uint8_t)(progress * 100.0f);
    out.flags = 0x03; // isStable | hasPerson
    out.eventCode = pendingEvent;
    out.checksumCrc16 = calculateCRC16((const uint8_t*)&out, 14);
    return out;
}

// ============================================================================
// ĐÓNG GÓI & GIẢI MÃ GÓI TIN 16 BYTES
// ============================================================================

size_t HeightEngine::serializePacket(const HeightPacketPayload& payload, uint8_t* buffer, size_t maxLen) {
    if (buffer == NULL || maxLen < HEIGHT_PACKET_SIZE) return 0;

    size_t offset = 0;
    buffer[offset++] = payload.header0;
    buffer[offset++] = payload.header1;
    buffer[offset++] = payload.packetType;
    buffer[offset++] = payload.state;
    buffer[offset++] = payload.guidance;

    buffer[offset++] = (uint8_t)(payload.lockedHeightMm & 0xFF);
    buffer[offset++] = (uint8_t)((payload.lockedHeightMm >> 8) & 0xFF);

    buffer[offset++] = (uint8_t)(payload.instantHeightMm & 0xFF);
    buffer[offset++] = (uint8_t)((payload.instantHeightMm >> 8) & 0xFF);

    buffer[offset++] = payload.progress;
    buffer[offset++] = payload.confidence;
    buffer[offset++] = payload.headZoneCount;
    buffer[offset++] = payload.eventCode;
    buffer[offset++] = payload.flags;

    uint16_t crc = calculateCRC16(buffer, offset);
    buffer[offset++] = (uint8_t)(crc & 0xFF);
    buffer[offset++] = (uint8_t)((crc >> 8) & 0xFF);

    return offset; // Đúng 16 Bytes
}

bool HeightEngine::deserializePacket(const uint8_t* buffer, size_t len, HeightPacketPayload& payload) {
    if (buffer == NULL || len < HEIGHT_PACKET_SIZE) return false;

    if (buffer[0] != HEIGHT_MAGIC_BYTE_0 || buffer[1] != HEIGHT_MAGIC_BYTE_1 || buffer[2] != HEIGHT_PACKET_TYPE) {
        return false;
    }

    uint16_t expectedCrc = (uint16_t)buffer[14] | ((uint16_t)buffer[15] << 8);
    uint16_t actualCrc = calculateCRC16(buffer, 14);
    if (expectedCrc != actualCrc) {
        return false;
    }

    payload.header0 = buffer[0];
    payload.header1 = buffer[1];
    payload.packetType = buffer[2];
    payload.state = buffer[3];
    payload.guidance = buffer[4];

    payload.lockedHeightMm = (uint16_t)buffer[5] | ((uint16_t)buffer[6] << 8);
    payload.instantHeightMm = (uint16_t)buffer[7] | ((uint16_t)buffer[8] << 8);
    payload.progress = buffer[9];
    payload.confidence = buffer[10];
    payload.headZoneCount = buffer[11];
    payload.eventCode = buffer[12];
    payload.flags = buffer[13];
    payload.checksumCrc16 = expectedCrc;

    return true;
}

uint16_t HeightEngine::calculateCRC16(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; i++) {
        crc ^= (uint16_t)data[i];
        for (int j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc = crc >> 1;
            }
        }
    }
    return crc;
}

void HeightEngine::printHeightMatrixLog(const VL53L5CXFrame& frame, const HeightEngineConfig& cfg, const HeightPacketPayload& payload) {
#ifdef ARDUINO
    const float stepRad = (45.0f / 8.0f) * (3.141592653589793f / 180.0f);
    
    Serial.println(F("\n================= [MA TRAN CHIEU CAO TOF 8x8] ================="));
    Serial.printf("Frame ID: %u | Timestamp: %ums\n", frame.frameId, frame.timestampMs);
    
    const char* stateStr = "IDLE";
    if (payload.state == HEIGHT_STATE_MEASURING) stateStr = "MEASURING";
    else if (payload.state == HEIGHT_STATE_HOLD_STILL) stateStr = "HOLD_STILL";
    else if (payload.state == HEIGHT_STATE_LOCKED) stateStr = "LOCKED";
    else if (payload.state == HEIGHT_STATE_TIMEOUT) stateStr = "TIMEOUT";
    else if (payload.state == HEIGHT_STATE_ERROR) stateStr = "ERROR";

    float instantCm = payload.instantHeightMm / 10.0f;
    float lockedCm = payload.lockedHeightMm / 10.0f;

    Serial.printf("Trang thai: %s | Tien trinh: %u%% | Dinh dau: %u zones\n", 
                  stateStr, payload.progress, payload.headZoneCount);
    if (payload.state == HEIGHT_STATE_LOCKED) {
        Serial.printf(">>> CHOT KHOA CHIỀU CAO: %.1f cm (Do tin cay: %u%%) <<<\n", 
                      lockedCm, payload.confidence);
    } else {
        Serial.printf("Chieu cao tuc thoi: %.1f cm | Tran: %umm | Be can: %umm\n", 
                      instantCm, cfg.expectedFloorMm, cfg.platformHeightMm);
    }

    Serial.println(F("Ma tran chieu cao tung zone (don vi: cm, dau * danh dau dinh dau):"));
    Serial.println(F("+-------+-------+-------+-------+-------+-------+-------+-------+"));

    for (int r = 0; r < 8; r++) {
        Serial.print("|");
        for (int c = 0; c < 8; c++) {
            int idx = r * 8 + c;
            uint8_t st = frame.targetStatuses[idx];
            uint16_t d = frame.distances[idx];

            float tanR = tanf((((float)r) - 3.5f) * stepRad);
            float tanC = tanf((((float)c) - 3.5f) * stepRad);
            float cosVal = 1.0f / sqrtf(1.0f + tanC * tanC + tanR * tanR);

            float z = ((float)d) * cosVal;
            float h = ((float)cfg.expectedFloorMm) - z - ((float)cfg.platformHeightMm);
            if (h < 0.0f || d <= 50 || d >= 3900 || st < 5) h = 0.0f;

            float hCm = h / 10.0f;

            // Đánh dấu nếu là vùng đỉnh đầu
            if (instantCm > 50.0f && fabsf(hCm - instantCm) <= 8.0f) {
                Serial.printf("*%5.1f |", hCm); // Dấu * đánh dấu cụm đỉnh đầu
            } else {
                Serial.printf(" %5.1f |", hCm);
            }
        }
        Serial.println();
        Serial.println(F("+-------+-------+-------+-------+-------+-------+-------+-------+"));
    }
#endif
}

