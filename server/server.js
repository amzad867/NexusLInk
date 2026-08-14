const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT =
    process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});

const server =
    app.listen(
        PORT,
        () => {
            console.log(
                "Server running on port " +
                PORT
            );
        }
    );

const wss =
    new WebSocketServer({
        server
    });

const devices = {};

function sendToPhones(message) {

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        if (
            device.type === "phone" &&
            device.socket.readyState === 1
        ) {

            try {
                device.socket.send(
                    JSON.stringify(message)
                );
            }
            catch (e) {
                console.log(
                    "PHONE SEND ERROR:",
                    e.message
                );
            }
        }
    }
}

function sendToTablets(message) {

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        if (
            device.type === "tablet" &&
            device.socket.readyState === 1
        ) {

            try {
                device.socket.send(
                    JSON.stringify(message)
                );
            }
            catch (e) {
                console.log(
                    "TABLET SEND ERROR:",
                    e.message
                );
            }
        }
    }
}

wss.on(
    "connection",
    (ws) => {

        console.log(
            "DEVICE CONNECTED"
        );

        ws.on(
            "message",
            (data) => {

                try {

                    const message =
                        JSON.parse(
                            data.toString()
                        );

                    console.log(
                        "RECEIVED:",
                        message.type
                    );

                    // =========================================
                    // REGISTER
                    // =========================================

                    if (
                        message.type ===
                        "register"
                    ) {

                        const deviceId =
                            message.deviceId;

                        if (
                            devices[deviceId]
                        ) {

                            try {
                                devices[
                                    deviceId
                                ].socket.close();
                            }
                            catch (e) {
                            }
                        }

                        devices[deviceId] = {

                            socket: ws,

                            type:
                                message.deviceType
                        };

                        console.log(
                            "REGISTERED:",
                            deviceId,
                            message.deviceType
                        );

                        return;
                    }

                    // =========================================
                    // LOCATION REQUEST
                    // =========================================

                    if (
                        message.type ===
                        "location_request"
                    ) {

                        sendToTablets({

                            type:
                                "location_request",

                            requestFrom:
                                message.phoneID,

                            requestId:
                                crypto.randomUUID()
                        });

                        return;
                    }

                    // =========================================
                    // TABLET STATUS
                    // =========================================

                    if (
                        message.type ===
                        "tablet_status"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // SCREEN REQUEST
                    // =========================================

                    if (
                        message.type ===
                        "screen_request"
                    ) {

                        sendToTablets({

                            type:
                                "screen_request",

                            requestFrom:
                                message.phoneID,

                            requestId:
                                crypto.randomUUID()
                        });

                        return;
                    }

                    // =========================================
                    // SCREEN FRAME
                    // =========================================

                    if (
                        message.type ===
                        "screen_frame"
                    ) {

                        sendToPhones({

                            type:
                                "screen_frame",

                            deviceId:
                                message.deviceId,

                            image:
                                message.image
                        });

                        return;
                    }

                    // =========================================
                    // SCREEN STARTED
                    // =========================================

                    if (
                        message.type ===
                        "screen_started"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // SCREEN STOPPED
                    // =========================================

                    if (
                        message.type ===
                        "screen_stopped"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // SCREEN ERROR
                    // =========================================

                    if (
                        message.type ===
                        "screen_error"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // CAMERA REQUEST
                    // =========================================

                    if (
                        message.type ===
                        "camera_request"
                    ) {

                        console.log(
                            "CAMERA REQUEST FROM PHONE:",
                            message.phoneID
                        );

                        sendToTablets({

                            type:
                                "camera_request",

                            requestFrom:
                                message.phoneID,

                            requestId:
                                crypto.randomUUID()
                        });

                        return;
                    }

                    // =========================================
                    // CAMERA FRAME
                    // =========================================

                    if (
                        message.type ===
                        "camera_frame"
                    ) {

                        console.log(
                            "CAMERA FRAME FROM:",
                            message.deviceId
                        );

                        sendToPhones({

                            type:
                                "camera_frame",

                            deviceId:
                                message.deviceId,

                            image:
                                message.image
                        });

                        return;
                    }

                    // =========================================
                    // CAMERA STARTED
                    // =========================================

                    if (
                        message.type ===
                        "camera_started"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // CAMERA STOPPED
                    // =========================================

                    if (
                        message.type ===
                        "camera_stopped"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                    // =========================================
                    // CAMERA ERROR
                    // =========================================

                    if (
                        message.type ===
                        "camera_error"
                    ) {

                        sendToPhones(
                            message
                        );

                        return;
                    }

                }
                catch (error) {

                    console.log(
                        "MESSAGE ERROR:",
                        error.message
                    );
                }
            }
        );

        ws.on(
            "close",
            () => {

                for (
                    const id in devices
                ) {

                    if (
                        devices[id].socket === ws
                    ) {

                        console.log(
                            "DEVICE DISCONNECTED:",
                            id
                        );

                        delete devices[id];
                    }
                }
            }
        );

        ws.on(
            "error",
            (error) => {

                console.log(
                    "SOCKET ERROR:",
                    error.message
                );
            }
        );
    }
);
