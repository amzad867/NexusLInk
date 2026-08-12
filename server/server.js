const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// SETTINGS
// =====================================================

const HEARTBEAT_INTERVAL = 15000;
const DEVICE_TIMEOUT = 45000;

// =====================================================
// HTTP SERVER
// =====================================================

app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});

const server = app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss = new WebSocketServer({
    server
});

// =====================================================
// DEVICES
// =====================================================

let devices = {};

// =====================================================
// MESSAGE STORAGE
// =====================================================

let messages = [];

// =====================================================
// SHOW ONLINE DEVICES
// =====================================================

function showOnlineDevices() {

    console.log("================================");
    console.log("ONLINE DEVICES");

    const ids = Object.keys(devices);

    if (ids.length === 0) {

        console.log("No devices online");

    } else {

        ids.forEach((id) => {

            console.log(
                " -",
                id,
                "(" + devices[id].type + ")",
                "lastSeen:",
                new Date(
                    devices[id].lastSeen
                ).toLocaleTimeString()
            );

        });
    }

    console.log("================================");
}

// =====================================================
// REMOVE DEVICE
// =====================================================

function removeDevice(
    deviceId,
    reason = "Unknown"
) {

    const device =
        devices[deviceId];

    if (!device) {
        return;
    }

    console.log("================================");
    console.log("REMOVING DEVICE");
    console.log("Device ID:", deviceId);
    console.log("Device Type:", device.type);
    console.log("Reason:", reason);
    console.log("================================");

    try {

        if (
            device.socket &&
            device.socket.readyState !== 3
        ) {

            device.socket.close(
                1000,
                "Device timeout"
            );
        }

    } catch (e) {

        console.log(
            "Socket close error:",
            e.message
        );
    }

    delete devices[deviceId];

    showOnlineDevices();
}

// =====================================================
// CLEAN STALE DEVICES
// =====================================================

setInterval(() => {

    const now =
        Date.now();

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        const age =
            now - device.lastSeen;

        if (
            age >
            DEVICE_TIMEOUT
        ) {

            console.log(
                "STALE DEVICE DETECTED:",
                id,
                "Age:",
                age + "ms"
            );

            removeDevice(
                id,
                "Heartbeat timeout"
            );
        }
    }

}, HEARTBEAT_INTERVAL);

// =====================================================
// SERVER PING
// =====================================================

setInterval(() => {

    wss.clients.forEach(
        (ws) => {

            if (
                ws.isAlive === false
            ) {

                console.log(
                    "WEBSOCKET DEAD - TERMINATING"
                );

                try {

                    ws.terminate();

                } catch (e) {

                    console.log(
                        "Terminate error:",
                        e.message
                    );
                }

                return;
            }

            ws.isAlive = false;

            try {

                ws.ping();

            } catch (e) {

                console.log(
                    "PING ERROR:",
                    e.message
                );
            }

        }
    );

}, HEARTBEAT_INTERVAL);

// =====================================================
// DEVICE CONNECTION
// =====================================================

wss.on(
    "connection",
    (ws) => {

        console.log("================================");
        console.log("DEVICE CONNECTED");
        console.log("================================");

        ws.isAlive = true;

        let registeredDeviceId = null;

        // =================================================
        // PONG
        // =================================================

        ws.on(
            "pong",
            () => {

                ws.isAlive = true;

                if (
                    registeredDeviceId &&
                    devices[
                        registeredDeviceId
                    ] &&
                    devices[
                        registeredDeviceId
                    ].socket === ws
                ) {

                    devices[
                        registeredDeviceId
                    ].lastSeen =
                        Date.now();

                }

            }
        );

        // =================================================
        // RECEIVE MESSAGE
        // =================================================

        ws.on(
            "message",
            (data) => {

                try {

                    const message =
                        JSON.parse(
                            data.toString()
                        );

                    console.log(
                        "Received:",
                        message
                    );

                    // =============================================
                    // UPDATE LAST SEEN
                    // =============================================

                    if (
                        registeredDeviceId &&
                        devices[
                            registeredDeviceId
                        ] &&
                        devices[
                            registeredDeviceId
                        ].socket === ws
                    ) {

                        devices[
                            registeredDeviceId
                        ].lastSeen =
                            Date.now();

                    }

                    // =============================================
                    // REGISTER DEVICE
                    // =============================================

                    if (
                        message.type ===
                        "register"
                    ) {

                        const deviceId =
                            message.deviceId;

                        const deviceType =
                            message.deviceType;

                        registeredDeviceId =
                            deviceId;

                        // -----------------------------------------
                        // REMOVE OLD CONNECTION
                        // -----------------------------------------

                        if (
                            devices[deviceId]
                        ) {

                            const oldSocket =
                                devices[
                                    deviceId
                                ].socket;

                            console.log(
                                "Replacing old connection:",
                                deviceId
                            );

                            try {

                                if (
                                    oldSocket !== ws &&
                                    oldSocket.readyState !== 3
                                ) {

                                    oldSocket.close(
                                        1000,
                                        "Replaced by new connection"
                                    );
                                }

                            } catch (e) {
                            }

                            delete devices[
                                deviceId
                            ];
                        }

                        // -----------------------------------------
                        // SAVE DEVICE
                        // -----------------------------------------

                        devices[
                            deviceId
                        ] = {

                            socket: ws,

                            type:
                                deviceType,

                            lastSeen:
                                Date.now()

                        };

                        console.log(
                            "================================"
                        );

                        console.log(
                            "REGISTERED DEVICE"
                        );

                        console.log(
                            "Device ID:",
                            deviceId
                        );

                        console.log(
                            "Device Type:",
                            deviceType
                        );

                        console.log(
                            "Last Seen:",
                            new Date(
                                devices[
                                    deviceId
                                ].lastSeen
                            ).toLocaleTimeString()
                        );

                        showOnlineDevices();

                        // -----------------------------------------
                        // SEND PENDING MESSAGES
                        // -----------------------------------------

                        messages.forEach(
                            (msg) => {

                                if (
                                    msg.receiver ===
                                        deviceId
                                    &&
                                    msg.status ===
                                        "pending"
                                ) {

                                    if (
                                        ws.readyState ===
                                        1
                                    ) {

                                        ws.send(
                                            JSON.stringify({

                                                type:
                                                    "tablet_message",

                                                messageId:
                                                    msg.id,

                                                message:
                                                    msg.message

                                            })
                                        );

                                        console.log(
                                            "Pending sent:",
                                            msg.id
                                        );
                                    }
                                }

                            }
                        );

                    }

                    // =============================================
                    // TABLET MESSAGE
                    // =============================================

                    if (
                        message.type ===
                        "tablet_message"
                    ) {

                        const id =
                            crypto.randomUUID();

                        const newMessage = {

                            id: id,

                            sender:
                                "tablet",

                            receiver:
                                message.phoneID,

                            message:
                                message.message,

                            status:
                                "pending",

                            time:
                                Date.now()

                        };

                        messages.push(
                            newMessage
                        );

                        console.log(
                            "Message Saved:",
                            id
                        );

                        const phone =
                            devices[
                                message.phoneID
                            ];

                        if (
                            phone &&
                            phone.socket.readyState ===
                            1
                        ) {

                            phone.socket.send(
                                JSON.stringify({

                                    type:
                                        "tablet_message",

                                    messageId:
                                        id,

                                    message:
                                        message.message

                                })
                            );

                            console.log(
                                "Delivery Attempt:",
                                id
                            );

                        } else {

                            console.log(
                                "Phone offline:",
                                message.phoneID
                            );
                        }
                    }

                    // =============================================
                    // PHONE REQUESTS TABLET LOCATION
                    // =============================================

                    if (
                        message.type ===
                        "location_request"
                    ) {

                        console.log(
                            "LOCATION REQUEST FROM PHONE:",
                            message
                        );

                        const phoneId =
                            message.phoneID;

                        let tabletFound =
                            false;

                        for (
                            const id in devices
                        ) {

                            const device =
                                devices[id];

                            if (
                                device.type ===
                                    "tablet"
                                &&
                                device.socket.readyState ===
                                    1
                            ) {

                                tabletFound =
                                    true;

                                const requestId =
                                    crypto.randomUUID();

                                device.socket.send(
                                    JSON.stringify({

                                        type:
                                            "location_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            requestId

                                    })
                                );

                                console.log(
                                    "LOCATION REQUEST SENT TO TABLET:",
                                    id
                                );
                            }
                        }

                        if (
                            !tabletFound
                        ) {

                            console.log(
                                "NO TABLET ONLINE"
                            );
                        }
                    }

                    // =============================================
                    // TABLET LOCATION + BATTERY STATUS
                    // =============================================

                    if (
                        message.type ===
                        "tablet_status"
                    ) {

                        console.log(
                            "================================"
                        );

                        console.log(
                            "TABLET STATUS RECEIVED"
                        );

                        console.log(
                            "Device ID:",
                            message.deviceId
                        );

                        console.log(
                            "Location:",
                            message.latitude,
                            message.longitude
                        );

                        console.log(
                            "Battery:",
                            message.battery
                        );

                        console.log(
                            "Charging:",
                            message.charging
                        );

                        console.log(
                            "================================"
                        );

                        for (
                            const id in devices
                        ) {

                            const device =
                                devices[id];

                            if (
                                device.type ===
                                    "phone"
                                &&
                                device.socket.readyState ===
                                    1
                            ) {

                                device.socket.send(
                                    JSON.stringify(
                                        message
                                    )
                                );

                                console.log(
                                    "Tablet status sent to phone:",
                                    id
                                );
                            }
                        }
                    }

                    // =============================================
                    // TABLET NOTIFICATION
                    // =============================================

                    if (
                        message.type ===
                        "notification"
                    ) {

                        for (
                            const id in devices
                        ) {

                            const device =
                                devices[id];

                            if (
                                device.type ===
                                    "phone"
                                &&
                                device.socket.readyState ===
                                    1
                            ) {

                                device.socket.send(
                                    JSON.stringify(
                                        message
                                    )
                                );

                                console.log(
                                    "Notification sent to phone:",
                                    id
                                );
                            }
                        }
                    }

                    // =============================================
                    // MESSAGE DELIVERY ACK
                    // =============================================

                    if (
                        message.type ===
                        "message_received"
                    ) {

                        const msg =
                            messages.find(
                                (m) =>
                                    m.id ===
                                    message.messageId
                            );

                        if (msg) {

                            msg.status =
                                "delivered";

                            console.log(
                                "Delivered:",
                                msg.id
                            );
                        }
                    }

                } catch (
                    error
                ) {

                    console.log(
                        "Error:",
                        error.message
                    );
                }

            }
        );

        // =================================================
        // DEVICE DISCONNECTED
        // =================================================

        ws.on(
            "close",
            () => {

                console.log(
                    "================================"
                );

                console.log(
                    "DEVICE DISCONNECTED"
                );

                let removedDevice =
                    false;

                // -----------------------------------------
                // ONLY REMOVE IF THIS SOCKET IS STILL
                // THE CURRENT SOCKET FOR THE DEVICE
                // -----------------------------------------

                if (
                    registeredDeviceId &&
                    devices[
                        registeredDeviceId
                    ] &&
                    devices[
                        registeredDeviceId
                    ].socket === ws
                ) {

                    console.log(
                        "Removed Device ID:",
                        registeredDeviceId
                    );

                    console.log(
                        "Removed Device Type:",
                        devices[
                            registeredDeviceId
                        ].type
                    );

                    delete devices[
                        registeredDeviceId
                    ];

                    removedDevice =
                        true;
                }

                // -----------------------------------------
                // FALLBACK SEARCH
                // -----------------------------------------

                if (
                    !removedDevice
                ) {

                    for (
                        const id in devices
                    ) {

                        if (
                            devices[id].socket ===
                            ws
                        ) {

                            console.log(
                                "Removed Device ID:",
                                id
                            );

                            console.log(
                                "Removed Device Type:",
                                devices[id].type
                            );

                            delete devices[id];

                            removedDevice =
                                true;

                            break;
                        }
                    }
                }

                if (
                    !removedDevice
                ) {

                    console.log(
                        "Disconnected socket was already removed"
                    );
                }

                showOnlineDevices();

                console.log(
                    "================================"
                );
            }
        );

        // =================================================
        // SOCKET ERROR
        // =================================================

        ws.on(
            "error",
            (error) => {

                console.log(
                    "DEVICE SOCKET ERROR:",
                    error.message
                );
            }
        );

    }
);
