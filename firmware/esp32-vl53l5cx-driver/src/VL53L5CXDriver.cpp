/**
 * @file VL53L5CXDriver.cpp
 * @brief Hiện thực hóa các phương thức của lớp VL53L5CXDriver.
 *
 * Bao gồm các thuật toán:
 * - Sinh dữ liệu ma trận giả lập 8x8 theo hình parabol đỉnh đầu người (~500mm).
 * - Đóng gói gói tin nhị phân (Serialization) chuẩn 204 Bytes.
 * - Giải mã gói tin nhị phân (Deserialization) và đối chiếu checksum CRC16 Modbus.
 * - Đảo ngược lăng kính thu Rx (Lens Orientation Flipping).
 */

#include "VL53L5CXDriver.h"
#include <string.h>
#include <math.h>

#ifdef ARDUINO
#include <Arduino.h>
#include <Wire.h>
#include <vl53l5cx_class.h>

static VL53L5CX sensorL5(&Wire, VL53L5CX_PIN_LPN);
#endif

// ============================================================================
// CONSTRUCTOR & DESTRUCTOR
// ============================================================================

VL53L5CXDriver::VL53L5CXDriver()
    : m_state(VL53L5CX_STATE_UNINITIALIZED),
      m_mockMode(false),
      m_frameCounter(0),
      m_ceilingHeightMm(VL53L5CX_BASE_HEIGHT_MM) { // 2220mm = 222.0cm (chiều cao từ cảm biến xuống sàn)
}

VL53L5CXDriver::~VL53L5CXDriver() {
}

// ============================================================================
// KHỞI TẠO & ĐIỀU KHIỂN TRẠNG THÁI (STATE MACHINE)
// ============================================================================

bool VL53L5CXDriver::init(bool enableMockMode) {
    m_mockMode = enableMockMode;
    m_state = VL53L5CX_STATE_INITIALIZING;

    // Nếu chạy chế độ Giả lập (Mock Mode), không truy cập bus I2C thật
    if (m_mockMode) {
        m_state = VL53L5CX_STATE_RANGING;
        return true;
    }

#ifndef MOCK_MODE_ONLY
#ifdef ARDUINO
    Serial.printf("[VL53L5CX HW] Khoi tao I2C (SDA=%d, SCL=%d, LPN=%d)...\n", 
                  VL53L5CX_PIN_SDA, VL53L5CX_PIN_SCL, VL53L5CX_PIN_LPN);
    
    Wire.begin(VL53L5CX_PIN_SDA, VL53L5CX_PIN_SCL);
    Wire.setClock(1000000); // 1MHz I2C Fast Mode Plus

    pinMode(VL53L5CX_PIN_LPN, OUTPUT);
    digitalWrite(VL53L5CX_PIN_LPN, HIGH);
    delay(10);

    Serial.println("[VL53L5CX HW] Dang khoi tao cam bien VL53L5CX...");
    if (sensorL5.begin() != 0) {
        Serial.println("[VL53L5CX HW] LOI: sensorL5.begin() khong thanh cong!");
        m_state = VL53L5CX_STATE_ERROR;
        return false;
    }

    if (sensorL5.init_sensor() != 0) {
        Serial.println("[VL53L5CX HW] LOI: sensorL5.init_sensor() khong thanh cong!");
        m_state = VL53L5CX_STATE_ERROR;
        return false;
    }

    sensorL5.vl53l5cx_set_resolution(VL53L5CX_RESOLUTION_8X8);
    sensorL5.vl53l5cx_set_ranging_frequency_hz(15);
    sensorL5.vl53l5cx_start_ranging();
    Serial.println("[VL53L5CX HW] Khoi tao phan cung thanh cong! Dang ranging 8x8 @ 15Hz...");
#endif
#endif

    m_state = VL53L5CX_STATE_RANGING;
    return true;
}

bool VL53L5CXDriver::startRanging() {
    if (m_state != VL53L5CX_STATE_RANGING && m_state != VL53L5CX_STATE_INITIALIZING) {
        return false;
    }
    m_state = VL53L5CX_STATE_RANGING;
    return true;
}

bool VL53L5CXDriver::stopRanging() {
    m_state = VL53L5CX_STATE_UNINITIALIZED;
    return true;
}

// ============================================================================
// ĐỌC DỮ LIỆU & SINH MOCK FRAME GIẢ LẬP
// ============================================================================

bool VL53L5CXDriver::readFrame(VL53L5CXFrame& frame) {
    if (m_state != VL53L5CX_STATE_RANGING) {
        return false;
    }

    if (m_mockMode) {
        m_frameCounter++;
        uint32_t simulatedTime = m_frameCounter * 66; // 15 FPS -> mỗi frame cách nhau 66ms
        frame = generateMockFrame(m_frameCounter, simulatedTime, 1750 /* Giả lập người cao 1m75 */);
        return true;
    }

#ifndef MOCK_MODE_ONLY
#ifdef ARDUINO
    VL53L5CX_ResultsData results;
    uint8_t isReady = 0;

    if (sensorL5.vl53l5cx_check_data_ready(&isReady) == 0 && isReady) {
        if (sensorL5.vl53l5cx_get_ranging_data(&results) == 0) {
            m_frameCounter++;
            frame.frameId = m_frameCounter;
            frame.timestampMs = millis();
            frame.zoneCount = VL53L5CX_ZONES;
            frame.isValid = true;

            for (int i = 0; i < VL53L5CX_ZONES; i++) {
                frame.distances[i] = (uint16_t)results.distance_mm[i];
                frame.targetStatuses[i] = results.target_status[i];
            }
            return true;
        }
    }
#endif
#endif
    return false;
}

VL53L5CXFrame VL53L5CXDriver::generateMockFrame(uint32_t frameId, uint32_t timestampMs, uint16_t personHeightMm, uint16_t platformHeightMm) {
    VL53L5CXFrame frame;
    frame.frameId = frameId;
    frame.timestampMs = timestampMs;
    frame.zoneCount = VL53L5CX_ZONES;
    frame.isValid = true;

    // Khoảng cách dự kiến từ cảm biến trần (2220mm) tới đỉnh đầu người
    // Người cao personHeightMm đứng trên bệ platformHeightMm -> Đỉnh đầu cách sàn = personHeightMm + platformHeightMm
    uint32_t totalHeightMm = (uint32_t)personHeightMm + (uint32_t)platformHeightMm;
    uint16_t headDistanceMm = (m_ceilingHeightMm > totalHeightMm) ? (uint16_t)(m_ceilingHeightMm - totalHeightMm) : 450;

    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 8; c++) {
            int idx = r * 8 + c;
            
            // Tính khoảng cách từ tâm ma trận (3.5, 3.5)
            double distFromCenter = sqrt((r - 3.5) * (r - 3.5) + (c - 3.5) * (c - 3.5));

            if (distFromCenter <= 1.0) {
                // Vùng tâm vòm đỉnh đầu (gần trần nhất)
                uint16_t variation = (idx * 3) % 10;
                frame.distances[idx] = headDistanceMm + variation;
                frame.targetStatuses[idx] = VL53L5CX_STATUS_VALID_100;
            } else if (distFromCenter <= 1.8) {
                // Vùng rìa vòm đầu
                uint16_t variation = (idx * 5) % 15;
                frame.distances[idx] = headDistanceMm + (uint16_t)(distFromCenter * 25.0) + variation;
                frame.targetStatuses[idx] = VL53L5CX_STATUS_VALID_100;
            } else if (distFromCenter <= 2.8) {
                // Vùng vai / phần thân trên (~800mm)
                frame.distances[idx] = headDistanceMm + 300 + (uint16_t)(distFromCenter * 40.0);
                frame.targetStatuses[idx] = VL53L5CX_STATUS_VALID_100;
            } else {
                // Vùng nền nhà / mặt sàn trống (~2100mm)
                frame.distances[idx] = m_ceilingHeightMm - 100;
                frame.targetStatuses[idx] = (idx % 9 == 0) ? VL53L5CX_STATUS_VALID_50 : VL53L5CX_STATUS_VALID_100;
            }
        }
    }

    return frame;
}

// ============================================================================
// ĐÓNG GÓI (SERIALIZE) VÀ GIẢI MÃ (DESERIALIZE) GÓI TIN NHỊ PHÂN 204 BYTES
// ============================================================================

size_t VL53L5CXDriver::serializeFrame(const VL53L5CXFrame& frame, uint8_t* buffer, size_t maxLen) {
    if (maxLen < VL53L5CX_PACKET_SIZE || buffer == NULL) {
        return 0;
    }

    size_t offset = 0;

    // 1. Ghi 2 bytes Header (0xAA, 0x55)
    buffer[offset++] = VL53L5CX_FRAME_HEADER_0;
    buffer[offset++] = VL53L5CX_FRAME_HEADER_1;

    // 2. Ghi 4 bytes Frame ID (uint32_t, Little Endian)
    buffer[offset++] = (uint8_t)(frame.frameId & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 8) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 16) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 24) & 0xFF);

    // 3. Ghi 4 bytes Timestamp (uint32_t, Little Endian)
    buffer[offset++] = (uint8_t)(frame.timestampMs & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 8) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 16) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 24) & 0xFF);

    // 4. Ghi mảng 64 khoảng cách (64 x uint16 = 128 bytes, Little Endian)
    for (int i = 0; i < VL53L5CX_ZONES; i++) {
        buffer[offset++] = (uint8_t)(frame.distances[i] & 0xFF);
        buffer[offset++] = (uint8_t)((frame.distances[i] >> 8) & 0xFF);
    }

    // 5. Ghi mảng 64 mã cờ trạng thái (64 x uint8 = 64 bytes)
    for (int i = 0; i < VL53L5CX_ZONES; i++) {
        buffer[offset++] = frame.targetStatuses[i];
    }

    // 6. Tính toán mã CRC16 Modbus trên 202 bytes dữ liệu đầu tiên
    uint16_t crc = calculateCRC16(buffer, offset);
    buffer[offset++] = (uint8_t)(crc & 0xFF);
    buffer[offset++] = (uint8_t)((crc >> 8) & 0xFF);

    return offset; // Trả về tổng 204 bytes
}

bool VL53L5CXDriver::deserializeFrame(const uint8_t* buffer, size_t len, VL53L5CXFrame& frame) {
    if (len < VL53L5CX_PACKET_SIZE || buffer == NULL) {
        return false;
    }

    // Kiểm tra 2 byte Header
    if (buffer[0] != VL53L5CX_FRAME_HEADER_0 || buffer[1] != VL53L5CX_FRAME_HEADER_1) {
        return false;
    }

    // Đối chiếu mã kiểm tra lỗi CRC16 Modbus (Byte 202 và Byte 203)
    uint16_t expectedCRC = (uint16_t)buffer[202] | ((uint16_t)buffer[203] << 8);
    uint16_t actualCRC = calculateCRC16(buffer, 202);

    if (expectedCRC != actualCRC) {
        return false; // Từ chối gói tin bị nhiễu đường truyền
    }

    size_t offset = 2;

    // Đọc Frame ID
    frame.frameId = (uint32_t)buffer[offset] |
                    ((uint32_t)buffer[offset + 1] << 8) |
                    ((uint32_t)buffer[offset + 2] << 16) |
                    ((uint32_t)buffer[offset + 3] << 24);
    offset += 4;

    // Đọc Timestamp
    frame.timestampMs = (uint32_t)buffer[offset] |
                        ((uint32_t)buffer[offset + 1] << 8) |
                        ((uint32_t)buffer[offset + 2] << 16) |
                        ((uint32_t)buffer[offset + 3] << 24);
    offset += 4;

    // Đọc Mảng 64 khoảng cách
    for (int i = 0; i < VL53L5CX_ZONES; i++) {
        frame.distances[i] = (uint16_t)buffer[offset] | ((uint16_t)buffer[offset + 1] << 8);
        offset += 2;
    }

    // Đọc Mảng 64 Target Status
    for (int i = 0; i < VL53L5CX_ZONES; i++) {
        frame.targetStatuses[i] = buffer[offset++];
    }

    frame.zoneCount = VL53L5CX_ZONES;
    frame.isValid = true;
    return true;
}

// ============================================================================
// HÀM TIỆN ÍCH TOÁN HỌC & CHUYỂN ĐỔI THẤU KÍNH
// ============================================================================

uint16_t VL53L5CXDriver::calculateCRC16(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; i++) {
        crc ^= (uint16_t)data[i];
        for (int j = 0; j < 8; j++) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001; // Đa thức Modbus 0xA001
            } else {
                crc = crc >> 1;
            }
        }
    }
    return crc;
}

void VL53L5CXDriver::flipLensOrientation(const uint16_t src[VL53L5CX_ZONES], uint16_t dst[VL53L5CX_ZONES]) {
    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 8; c++) {
            int srcIdx = r * 8 + c;
            int dstIdx = (7 - r) * 8 + (7 - c); // Đảo ngược 2 chiều không gian
            dst[dstIdx] = src[srcIdx];
        }
    }
}

void VL53L5CXDriver::printFrameLog(const VL53L5CXFrame& frame, uint16_t refHeightMm) {
#ifdef ARDUINO
    uint16_t minDist = 0xFFFF;
    uint16_t maxDist = 0;
    uint16_t centerDist = frame.distances[27]; // Vùng trung tâm

    for (int i = 0; i < VL53L5CX_ZONES; i++) {
        if (frame.distances[i] < minDist) minDist = frame.distances[i];
        if (frame.distances[i] > maxDist) maxDist = frame.distances[i];
    }

    // Chiều cao ước tính người đứng: Chênh lệch từ mốc cảm biến (222.0cm) xuống đỉnh đầu
    float estPersonHeightCm = 0.0f;
    if (refHeightMm > minDist && minDist > 30) {
        estPersonHeightCm = (refHeightMm - minDist) / 10.0f;
    }

    Serial.println(F("\n================= [VL53L5CX DATA LOG] ================="));
    Serial.printf("Frame ID: %u | Timestamp: %ums | Valid: %s\n", 
                  frame.frameId, frame.timestampMs, frame.isValid ? "YES" : "NO");
    Serial.printf("Base Sensor: %.1fcm (Cam bien xuong san) | Est Person Height: %.1fcm\n", 
                  refHeightMm / 10.0f, estPersonHeightCm);
    Serial.printf("Min Dist: %umm | Max Dist: %umm | Center Dist: %umm\n", 
                  minDist, maxDist, centerDist);
    Serial.println(F("Ma tran khoang cach 8x8 (mm):"));
    Serial.println(F("+------+------+------+------+------+------+------+------+"));

    for (int r = 0; r < 8; r++) {
        Serial.print("|");
        for (int c = 0; c < 8; c++) {
            int idx = r * 8 + c;
            Serial.printf(" %4u |", frame.distances[idx]);
        }
        Serial.println();
        Serial.println(F("+------+------+------+------+------+------+------+------+"));
    }
#endif
}
