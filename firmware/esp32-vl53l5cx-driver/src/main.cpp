/**
 * @file main.cpp
 * @brief Firmware main entrypoint cho vi điều khiển ESP32 (Arduino Framework trên PlatformIO).
 *
 * Chức năng:
 * - Khởi tạo cổng USB Serial ở tốc độ 460800 baud.
 * - Khởi tạo Driver VL53L5CX (Chạy Mock Mode hoặc Hardware Mode).
 * - Lắng nghe lệnh bắt tay PING (`0xAA 0x55 0x50 0x47`) từ Kiosk và phản hồi PONG (`0xAA 0x55 0x4F 0x4B`).
 * - Vòng lặp `loop()` đọc dữ liệu 64 zones ở tần số 15Hz (66ms) và truyền gói nhị phân 204 Bytes xuống Kiosk Android.
 */

#ifndef MOCK_MODE_ONLY

#include <Arduino.h>
#include <Wire.h>
#include "VL53L5CXDriver.h"

// Instance Driver toàn cục
static VL53L5CXDriver driver;

// Bộ đệm chứa gói tin nhị phân 204 bytes sẵn sàng gửi qua Serial
static uint8_t packetBuffer[VL53L5CX_PACKET_SIZE];

void setup() {
    // 1. Khởi tạo cổng Serial baudrate 460800 (Fast Serial Transfer)
    Serial.begin(460800);
    while (!Serial && millis() < 3000);

    Serial.println("[VL53L5CX] Khoi tao Firmware ESP32 Driver...");

    bool mockMode = false;
    
#ifdef ENABLE_MOCK_DATA
    mockMode = true;
    Serial.println("[VL53L5CX] Dang chay o che do GIẢ LẬP (MOCK DATA MODE).");
#endif

    // 2. Khởi tạo Driver
    if (!driver.init(mockMode)) {
        Serial.println("[VL53L5CX] LOI: Khong the khoi tao cam bien!");
        while (1) {
            delay(1000);
        }
    }

    // 3. Bắt đầu đo continuous ở tần số 15Hz
    driver.startRanging();
    Serial.println("[VL53L5CX] Driver san sang. Dang bat dau do 15Hz (66ms/frame)...");
}

// Cấu hình Chế độ Truyền Serial:
// - Để nguyên comment `//#define STREAM_BINARY_TO_KIOSK`: Xem log bảng 8x8 sạch sẽ trên Serial Monitor (Không bị rác chữ nhị phân).
// - Bỏ comment `#define STREAM_BINARY_TO_KIOSK`: Bắn mảng nhị phân 204 bytes xuống Kiosk Android.
//#define STREAM_BINARY_TO_KIOSK

void loop() {
    // 1. Kiểm tra câu lệnh bắt tay Probe Handshake từ Kiosk (4 Bytes: 0xAA 0x55 'P' 'G')
    if (Serial.available() >= 4) {
        uint8_t cmd[4];
        if (Serial.readBytes(cmd, 4) == 4) {
            if (cmd[0] == VL53L5CX_FRAME_HEADER_0 && 
                cmd[1] == VL53L5CX_FRAME_HEADER_1 && 
                cmd[2] == VL53L5CX_CMD_PING_BYTE_2 && 
                cmd[3] == VL53L5CX_CMD_PING_BYTE_3) {
                // Phản hồi gói PONG Handshake Ack (4 Bytes: 0xAA 0x55 'O' 'K')
                static const uint8_t pongResp[4] = {
                    VL53L5CX_FRAME_HEADER_0,
                    VL53L5CX_FRAME_HEADER_1,
                    VL53L5CX_RESP_PONG_BYTE_2,
                    VL53L5CX_RESP_PONG_BYTE_3
                };
                Serial.write(pongResp, 4);
            }
        }
    }

    VL53L5CXFrame frame;

    // 2. Đọc frame mới nhất
    if (driver.readFrame(frame)) {
#ifdef STREAM_BINARY_TO_KIOSK
        // Đóng gói frame thành mảng nhị phân 204 bytes truyền xuống Kiosk
        size_t bytesSerialized = VL53L5CXDriver::serializeFrame(frame, packetBuffer, sizeof(packetBuffer));
        if (bytesSerialized > 0) {
            Serial.write(packetBuffer, bytesSerialized);
        }
#endif

        // 3. Log dữ liệu ma trận 8x8 trực quan ra Serial Monitor mỗi 1 giây (~15 frames)
        static uint32_t logCounter = 0;
        if (++logCounter % 15 == 0) {
            VL53L5CXDriver::printFrameLog(frame);
        }
    }

    // Tần số lấy mẫu 15 Hz (~66ms cho mỗi chu kỳ đo)
    delay(66);
}

#endif // MOCK_MODE_ONLY
