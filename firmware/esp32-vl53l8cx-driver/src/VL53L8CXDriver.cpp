/**
 * @file VL53L8CXDriver.cpp
 * @brief Hiện thực hóa các phương thức của lớp VL53L8CXDriver cho chip STMicroelectronics VL53L8CX.
 *
 * Hỗ trợ:
 * - Khởi tạo SPI bus tốc độ cao (VSPI 10MHz) hoặc I2C bus (1MHz Fast Mode Plus).
 * - Cấu hình ULD ST: Target Order CLOSEST, Sharpener 1%, Resolution 8x8.
 * - Sinh dữ liệu ma trận giả lập 8x8 theo hình parabol đỉnh đầu người (~500mm).
 * - Đóng gói gói tin nhị phân chuẩn 204 Bytes & CRC16-Modbus.
 * - Đảo ngược lăng kính thu Rx (Lens Orientation Flipping).
 */

#include "VL53L8CXDriver.h"
#include <string.h>
#include <math.h>

#ifdef ARDUINO
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <vl53l8cx_class.h>

#ifdef VL53L8CX_USE_I2C
static VL53L8CX sensorL8(&Wire, VL53L8CX_PIN_LPN);
#else
static VL53L8CX sensorL8(&SPI, VL53L8CX_PIN_CS, VL53L8CX_PIN_LPN);
#endif
#endif

// ============================================================================
// CONSTRUCTOR & DESTRUCTOR
// ============================================================================

VL53L8CXDriver::VL53L8CXDriver()
    : m_state(VL53L8CX_STATE_UNINITIALIZED),
      m_mockMode(false),
      m_useSpi(true),
      m_frameCounter(0),
      m_ceilingHeightMm(VL53L8CX_BASE_HEIGHT_MM) {
}

VL53L8CXDriver::~VL53L8CXDriver() {
}

// ============================================================================
// KHỞI TẠO & ĐIỀU KHIỂN TRẠNG THÁI (STATE MACHINE)
// ============================================================================

bool VL53L8CXDriver::init(bool enableMockMode, bool useSpiMode) {
    m_mockMode = enableMockMode;
    m_useSpi = useSpiMode;
    m_state = VL53L8CX_STATE_INITIALIZING;

    if (m_mockMode) {
        m_state = VL53L8CX_STATE_RANGING;
        return true;
    }

#ifndef MOCK_MODE_ONLY
#ifdef ARDUINO
    if (m_useSpi) {
        Serial.printf("[VL53L8CX HW] Khoi tao SPI Bus (SCK=%d, MISO=%d, MOSI=%d, CS=%d, LPN=%d)...\n",
                      VL53L8CX_PIN_SCK, VL53L8CX_PIN_MISO, VL53L8CX_PIN_MOSI, VL53L8CX_PIN_CS, VL53L8CX_PIN_LPN);

        pinMode(VL53L8CX_PIN_CS, OUTPUT);
        digitalWrite(VL53L8CX_PIN_CS, HIGH);

        pinMode(VL53L8CX_PIN_LPN, OUTPUT);
        digitalWrite(VL53L8CX_PIN_LPN, HIGH);
        delay(10);

        SPI.begin(VL53L8CX_PIN_SCK, VL53L8CX_PIN_MISO, VL53L8CX_PIN_MOSI, VL53L8CX_PIN_CS);
    } else {
        Serial.printf("[VL53L8CX HW] Khoi tao I2C Bus (SDA=%d, SCL=%d, LPN=%d)...\n",
                      VL53L8CX_PIN_I2C_SDA, VL53L8CX_PIN_I2C_SCL, VL53L8CX_PIN_LPN);

        pinMode(VL53L8CX_PIN_LPN, OUTPUT);
        digitalWrite(VL53L8CX_PIN_LPN, HIGH);
        delay(10);

        Wire.begin(VL53L8CX_PIN_I2C_SDA, VL53L8CX_PIN_I2C_SCL);
        Wire.setClock(1000000); // 1MHz
    }

    Serial.println(F("[VL53L8CX HW] Dang nạp firmware ULD khoi tao cam bien VL53L8CX..."));
    if (sensorL8.begin() != 0) {
        Serial.println(F("[VL53L8CX HW] LOI: sensorL8.begin() khong thanh cong! Kiem tra day nguon/CS."));
        m_state = VL53L8CX_STATE_ERROR;
        return false;
    }

    if (sensorL8.init_sensor() != 0) {
        Serial.println(F("[VL53L8CX HW] LOI: sensorL8.init_sensor() khong thanh cong!"));
        m_state = VL53L8CX_STATE_ERROR;
        return false;
    }

    // Cấu hình tối ưu nhân trắc học:
    // 1. Resolution 8x8 (64 vùng đo)
    sensorL8.vl53l8cx_set_resolution(VL53L8CX_RESOLUTION_8X8);

    // 2. Tần số quét 15Hz (hoặc 30Hz qua SPI)
    sensorL8.vl53l8cx_set_ranging_frequency_hz(15);

    // 3. Ưu tiên đỉnh đầu gần trần nhất
    sensorL8.vl53l8cx_set_target_order(VL53L8CX_TARGET_ORDER_CLOSEST);

    // 4. Mức lọc tán xạ biên 1%
    sensorL8.vl53l8cx_set_sharpener_percent(1);

    sensorL8.vl53l8cx_start_ranging();
    Serial.println(F("[VL53L8CX HW] Khoi tao phan cung thanh cong! Dang ranging 8x8 @ 15Hz..."));
#endif
#endif

    m_state = VL53L8CX_STATE_RANGING;
    return true;
}

bool VL53L8CXDriver::startRanging() {
    if (m_state != VL53L8CX_STATE_RANGING && m_state != VL53L8CX_STATE_INITIALIZING) {
        return false;
    }
    m_state = VL53L8CX_STATE_RANGING;
    return true;
}

bool VL53L8CXDriver::stopRanging() {
    m_state = VL53L8CX_STATE_UNINITIALIZED;
    return true;
}

// ============================================================================
// ĐỌC DỮ LIỆU & SINH MOCK FRAME GIẢ LẬP
// ============================================================================

bool VL53L8CXDriver::readFrame(VL53L8CXFrame& frame) {
    if (m_state != VL53L8CX_STATE_RANGING) {
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
    VL53L8CX_ResultsData results;
    uint8_t isReady = 0;

    if (sensorL8.vl53l8cx_check_data_ready(&isReady) == 0 && isReady) {
        if (sensorL8.vl53l8cx_get_ranging_data(&results) == 0) {
            m_frameCounter++;
            frame.frameId = m_frameCounter;
            frame.timestampMs = millis();
            frame.zoneCount = VL53L8CX_ZONES;
            frame.isValid = true;

            for (int i = 0; i < VL53L8CX_ZONES; i++) {
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

VL53L8CXFrame VL53L8CXDriver::generateMockFrame(uint32_t frameId, uint32_t timestampMs, uint16_t personHeightMm, uint16_t platformHeightMm) {
    VL53L8CXFrame frame;
    frame.frameId = frameId;
    frame.timestampMs = timestampMs;
    frame.zoneCount = VL53L8CX_ZONES;
    frame.isValid = true;

    uint32_t totalHeightMm = (uint32_t)personHeightMm + (uint32_t)platformHeightMm;
    uint16_t headDistanceMm = (m_ceilingHeightMm > totalHeightMm) ? (uint16_t)(m_ceilingHeightMm - totalHeightMm) : 450;

    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 8; c++) {
            int idx = r * 8 + c;
            double distFromCenter = sqrt((r - 3.5) * (r - 3.5) + (c - 3.5) * (c - 3.5));

            if (distFromCenter <= 1.0) {
                uint16_t variation = (idx * 3) % 10;
                frame.distances[idx] = headDistanceMm + variation;
                frame.targetStatuses[idx] = VL53L8CX_STATUS_VALID_100;
            } else if (distFromCenter <= 1.8) {
                uint16_t variation = (idx * 5) % 15;
                frame.distances[idx] = headDistanceMm + (uint16_t)(distFromCenter * 25.0) + variation;
                frame.targetStatuses[idx] = VL53L8CX_STATUS_VALID_100;
            } else if (distFromCenter <= 2.8) {
                frame.distances[idx] = headDistanceMm + 300 + (uint16_t)(distFromCenter * 40.0);
                frame.targetStatuses[idx] = VL53L8CX_STATUS_VALID_100;
            } else {
                frame.distances[idx] = m_ceilingHeightMm - 100;
                frame.targetStatuses[idx] = (idx % 9 == 0) ? VL53L8CX_STATUS_VALID_50 : VL53L8CX_STATUS_VALID_100;
            }
        }
    }

    return frame;
}

// ============================================================================
// ĐÓNG GÓI (SERIALIZE) VÀ GIẢI MÃ (DESERIALIZE) GÓI TIN NHỊ PHÂN 204 BYTES
// ============================================================================

size_t VL53L8CXDriver::serializeFrame(const VL53L8CXFrame& frame, uint8_t* buffer, size_t maxLen) {
    if (maxLen < VL53L8CX_PACKET_SIZE || buffer == NULL) {
        return 0;
    }

    size_t offset = 0;

    buffer[offset++] = VL53L8CX_FRAME_HEADER_0;
    buffer[offset++] = VL53L8CX_FRAME_HEADER_1;

    buffer[offset++] = (uint8_t)(frame.frameId & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 8) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 16) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.frameId >> 24) & 0xFF);

    buffer[offset++] = (uint8_t)(frame.timestampMs & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 8) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 16) & 0xFF);
    buffer[offset++] = (uint8_t)((frame.timestampMs >> 24) & 0xFF);

    for (int i = 0; i < VL53L8CX_ZONES; i++) {
        buffer[offset++] = (uint8_t)(frame.distances[i] & 0xFF);
        buffer[offset++] = (uint8_t)((frame.distances[i] >> 8) & 0xFF);
    }

    for (int i = 0; i < VL53L8CX_ZONES; i++) {
        buffer[offset++] = frame.targetStatuses[i];
    }

    uint16_t crc = calculateCRC16(buffer, offset);
    buffer[offset++] = (uint8_t)(crc & 0xFF);
    buffer[offset++] = (uint8_t)((crc >> 8) & 0xFF);

    return offset;
}

bool VL53L8CXDriver::deserializeFrame(const uint8_t* buffer, size_t len, VL53L8CXFrame& frame) {
    if (len < VL53L8CX_PACKET_SIZE || buffer == NULL) {
        return false;
    }

    if (buffer[0] != VL53L8CX_FRAME_HEADER_0 || buffer[1] != VL53L8CX_FRAME_HEADER_1) {
        return false;
    }

    uint16_t expectedCRC = (uint16_t)buffer[202] | ((uint16_t)buffer[203] << 8);
    uint16_t actualCRC = calculateCRC16(buffer, 202);

    if (expectedCRC != actualCRC) {
        return false;
    }

    size_t offset = 2;

    frame.frameId = (uint32_t)buffer[offset] |
                    ((uint32_t)buffer[offset + 1] << 8) |
                    ((uint32_t)buffer[offset + 2] << 16) |
                    ((uint32_t)buffer[offset + 3] << 24);
    offset += 4;

    frame.timestampMs = (uint32_t)buffer[offset] |
                        ((uint32_t)buffer[offset + 1] << 8) |
                        ((uint32_t)buffer[offset + 2] << 16) |
                        ((uint32_t)buffer[offset + 3] << 24);
    offset += 4;

    for (int i = 0; i < VL53L8CX_ZONES; i++) {
        frame.distances[i] = (uint16_t)buffer[offset] | ((uint16_t)buffer[offset + 1] << 8);
        offset += 2;
    }

    for (int i = 0; i < VL53L8CX_ZONES; i++) {
        frame.targetStatuses[i] = buffer[offset++];
    }

    frame.zoneCount = VL53L8CX_ZONES;
    frame.isValid = true;
    return true;
}

// ============================================================================
// HÀM TIỆN ÍCH TOÁN HỌC & CHUYỂN ĐỔI THẤU KÍNH
// ============================================================================

uint16_t VL53L8CXDriver::calculateCRC16(const uint8_t* data, size_t length) {
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

void VL53L8CXDriver::flipLensOrientation(const uint16_t src[VL53L8CX_ZONES], uint16_t dst[VL53L8CX_ZONES]) {
    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 8; c++) {
            int srcIdx = r * 8 + c;
            int dstIdx = (7 - r) * 8 + (7 - c);
            dst[dstIdx] = src[srcIdx];
        }
    }
}

void VL53L8CXDriver::printFrameLog(const VL53L8CXFrame& frame, uint16_t refHeightMm) {
#ifdef ARDUINO
    uint16_t minDist = 0xFFFF;
    uint16_t maxDist = 0;
    uint16_t centerDist = frame.distances[27];

    for (int i = 0; i < VL53L8CX_ZONES; i++) {
        if (frame.distances[i] < minDist) minDist = frame.distances[i];
        if (frame.distances[i] > maxDist) maxDist = frame.distances[i];
    }

    float estPersonHeightCm = 0.0f;
    if (refHeightMm > minDist && minDist > 30) {
        estPersonHeightCm = (refHeightMm - minDist) / 10.0f;
    }

    Serial.println(F("\n================= [VL53L8CX DATA LOG] ================="));
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
