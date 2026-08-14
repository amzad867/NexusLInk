const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT =
    process.env.PORT || 3000;


// =====================================================
// HTTP
// =====================================================

app.get("/", (req, res) => {

    res.send(
        "Nexus Link Server Running"
    );
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


// =====================================================
// WEBSOCKET
// =====================================================

const wss =
    new WebSocketServer({
        server
    });


// =====================================================
// DEVICES
// =====================================================

const devices = {};


// =====================================================
// HELPERS
// =====================================================

function sendToDevice(
    deviceId,
    message
) {

    const device =
        devices[deviceId];

    if (
        !device
    ) {

        return false;
    }

    if (
        device.socket.readyState !== 1
    ) {

        return false;
    }

    try {

        device.socket.send(
            JSON.stringify(
                message
            )
        );

        return true;

    } catch (
        error
    ) {

        console.log(
            "SEND ERROR:",
            error.message
        );

        return false;
    }
}


function sendToPhones(
    message
) {

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
                    JSON.stringify(
                        message
                    )
                );

            } catch (
                error
            ) {

                console.log(
                    "PHONE SEND ERROR:",
                    error.message
                );
            }
        }
    }
}


// =====================================================
// CONNECTION
// =====================================================

wss.on(
    "connection",
    (ws) => {

        console.log(
            "DEVICE CONNECTED"
        );


        // =================================================
        // MESSAGE
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
                        "RECEIVED:",
                        message.type
                    );


                    // =====================================
                    // REGISTER
                    // =====================================

                    if (
                        message.type ===
                        "register"
                    ) {

                        const deviceId =
                            message.deviceId;

                        const deviceType =
                            message.deviceType;


                        if (
                            !deviceId ||
                            !deviceType
                        ) {

                            return;
                        }


                        // ---------------------------------
                        // CLOSE OLD SOCKET
                        // ---------------------------------

                        if (
                            devices[deviceId]
                        ) {

                            try {

                                devices[
                                    deviceId
                                ].socket.close();

                            } catch (_) {
                            }
                        }


                        // ---------------------------------
                        // REGISTER
                        // ---------------------------------

                        devices[deviceId] = {

                            socket: ws,

                            type:
                                deviceType
                        };


                        console.log(
                            "REGISTERED:",
                            deviceId,
                            deviceType
                        );


                        console.log(
                            "ONLINE DEVICES:"
                        );


                        for (
                            const id in devices
                        ) {

                            console.log(
                                " -",
                                id,
                                devices[id].type
                            );
                        }


                        return;
                    }


                    // =====================================
                    // SCREEN REQUEST
                    // =====================================

                    if (
                        message.type ===
                        "screen_request"
                    ) {

                        const phoneId =
                            message.phoneID;


                        console.log(
                            "SCREEN REQUEST:",
                            phoneId
                        );


                        let tabletFound =
                            false;


                        for (
                            const id in devices
                        ) {

                            const device =
                                devices[id];


                            if (
                                device.type ===
                                    "tablet" &&
                                device.socket
                                    .readyState === 1
                            ) {

                                tabletFound =
                                    true;


                                device.socket.send(

                                    JSON.stringify({

                                        type:
                                            "screen_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            crypto
                                                .randomUUID()
                                    })
                                );


                                console.log(
                                    "SCREEN REQUEST SENT TO TABLET:",
                                    id
                                );


                                // One tablet only
                                break;
                            }
                        }


                        if (
                            !tabletFound
                        ) {

                            sendToDevice(

                                phoneId,

                                {
                                    type:
                                        "screen_error",

                                    error:
                                        "Tablet offline"
                                }
                            );
                        }


                        return;
                    }


                    // =====================================
                    // CAMERA REQUEST
                    // =====================================

                    if (
                        message.type ===
                        "camera_request"
                    ) {

                        const phoneId =
                            message.phoneID;


                        console.log(
                            "CAMERA REQUEST:",
                            phoneId
                        );


                        let tabletFound =
                            false;


                        for (
                            const id in devices
                        ) {

                            const device =
                                devices[id];


                            if (
                                device.type ===
                                    "tablet" &&
                                device.socket
                                    .readyState === 1
                            ) {

                                tabletFound =
                                    true;


                                device.socket.send(

                                    JSON.stringify({

                                        type:
                                            "camera_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            crypto
                                                .randomUUID()
                                    })
                                );


                                console.log(
                                    "CAMERA REQUEST SENT TO TABLET:",
                                    id
                                );


                                break;
                            }
                        }


                        if (
                            !tabletFound
                        ) {

                            sendToDevice(

                                phoneId,

                                {
                                    type:
                                        "camera_error",

                                    error:
                                        "Tablet offline"
                                }
                            );
                        }


                        return;
                    }


                    // =====================================
                    // SCREEN FRAME
                    // =====================================

                    if (
                        message.type ===
                        "screen_frame"
                    ) {

                        console.log(
                            "SCREEN FRAME FROM:",
                            message.deviceId
                        );


                        // Send to all phones
                        // because active phone is
                        // normally the only phone.

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


                    // =====================================
                    // SCREEN STARTED
                    // =====================================

                    if (
                        message.type ===
                        "screen_started"
                    ) {

                        sendToPhones({

                            type:
                                "screen_started",

                            deviceId:
                                message.deviceId
                        });


                        return;
                    }


                    // =====================================
                    // SCREEN STOPPED
                    // =====================================

                    if (
                        message.type ===
                        "screen_stopped"
                    ) {

                        sendToPhones({

                            type:
                                "screen_stopped",

                            deviceId:
                                message.deviceId
                        });


                        return;
                    }


                    // =====================================
                    // SCREEN ERROR
                    // =====================================

                    if (
                        message.type ===
                        "screen_error"
                    ) {

                        sendToPhones({

                            type:
                                "screen_error",

                            deviceId:
                                message.deviceId,

                            error:
                                message.error
                        });


                        return;
                    }


                    // =====================================
                    // CAMERA FRAME
                    // =====================================

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


                    // =====================================
                    // CAMERA STARTED
                    // =====================================

                    if (
                        message.type ===
                        "camera_started"
                    ) {

                        sendToPhones({

                            type:
                                "camera_started",

                            deviceId:
                                message.deviceId
                        });


                        return;
                    }


                    // =====================================
                    // CAMERA STOPPED
                    // =====================================

                    if (
                        message.type ===
                        "camera_stopped"
                    ) {

                        sendToPhones({

                            type:
                                "camera_stopped",

                            deviceId:
                                message.deviceId
                        });


                        return;
                    }


                    // =====================================
                    // CAMERA ERROR
                    // =====================================

                    if (
                        message.type ===
                        "camera_error"
                    ) {

                        sendToPhones({

                            type:
                                "camera_error",

                            deviceId:
                                message.deviceId,

                            error:
                                message.error
                        });


                        return;
                    }

                } catch (
                    error
                ) {

                    console.log(
                        "MESSAGE ERROR:",
                        error.message
                    );
                }
            }
        );


        // =================================================
        // CLOSE
        // =================================================

        ws.on(
            "close",
            () => {

                console.log(
                    "DEVICE DISCONNECTED"
                );


                for (
                    const id in devices
                ) {

                    if (
                        devices[id].socket ===
                        ws
                    ) {

                        console.log(
                            "REMOVED:",
                            id
                        );


                        delete devices[id];
                    }
                }
            }
        );


        // =================================================
        // ERROR
        // =================================================

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
