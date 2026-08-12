const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

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
// DEVICE CONNECTION
// =====================================================

wss.on("connection", (ws) => {

    console.log("================================");
    console.log("DEVICE CONNECTED");
    console.log("================================");

    // =================================================
    // RECEIVE MESSAGE
    // =================================================

    ws.on("message", (data) => {

        try {

            const message =
                JSON.parse(data.toString());

            console.log("Received:", message);

            // =============================================
            // REGISTER DEVICE
            // =============================================

            if (message.type === "register") {

                // -----------------------------------------
                // If same device ID already exists
                // remove old connection
                // -----------------------------------------

                if (devices[message.deviceId]) {

                    console.log(
                        "Replacing old connection:",
                        message.deviceId
                    );

                    try {

                        devices[
                            message.deviceId
                        ].socket.close();

                    } catch (e) {
                    }

                    delete devices[
                        message.deviceId
                    ];
                }

                devices[message.deviceId] = {

                    socket: ws,

                    type: message.deviceType

                };

                console.log(
                    "================================"
                );

                console.log(
                    "REGISTERED DEVICE"
                );

                console.log(
                    "Device ID:",
                    message.deviceId
                );

                console.log(
                    "Device Type:",
                    message.deviceType
                );

                console.log(
                    "Online Devices:"
                );

                for (const id in devices) {

                    console.log(
                        " -",
                        id,
                        "(" +
                        devices[id].type +
                        ")"
                    );

                }

                console.log(
                    "================================"
                );

                // -----------------------------------------
                // SEND PENDING MESSAGES
                // -----------------------------------------

                messages.forEach((msg) => {

                    if (
                        msg.receiver ===
                            message.deviceId
                        &&
                        msg.status ===
                            "pending"
                    ) {

                        if (
                            ws.readyState === 1
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
                });
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

                    sender: "tablet",

                    receiver:
                        message.phoneID,

                    message:
                        message.message,

                    status: "pending",

                    time: Date.now()

                };

                messages.push(
                    newMessage
                );

                console.log(
                    "Message Saved:",
                    id
                );

                // -----------------------------------------
                // TRY DELIVERY TO PHONE
                // -----------------------------------------

                const phone =
                    devices[
                        message.phoneID
                    ];

                if (
                    phone &&
                    phone.socket.readyState === 1
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

                // -----------------------------------------
                // FIND ALL ONLINE TABLETS
                // -----------------------------------------

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

                // -----------------------------------------
                // SEND ONLY TO PHONES
                // -----------------------------------------

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

        }
        catch (error) {

            console.log(
                "Error:",
                error.message
            );
        }

    });

    // =================================================
    // DEVICE DISCONNECTED
    // =================================================

    ws.on("close", () => {

        console.log(
            "================================"
        );

        console.log(
            "DEVICE DISCONNECTED"
        );

        let removedDevice =
            false;

        for (
            const id in devices
        ) {

            if (
                devices[id].socket === ws
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

            }
        }

        if (!removedDevice) {

            console.log(
                "WARNING: Disconnected socket was not found in devices"
            );
        }

        console.log(
            "Remaining Online Devices:"
        );

        for (
            const id in devices
        ) {

            console.log(
                " -",
                id,
                "(" +
                devices[id].type +
                ")"
            );
        }

        console.log(
            "================================"
        );

    });

    // =================================================
    // SOCKET ERROR
    // =================================================

    ws.on("error", (error) => {

        console.log(
            "DEVICE SOCKET ERROR:",
            error.message
        );

    });

});
