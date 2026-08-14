const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;


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
// MESSAGES
// =====================================================

const messages = [];


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


                    // =========================================
                    // REGISTER
                    // =========================================

                    if (
                        message.type ===
                        "register"
                    ) {

                        const deviceId =
                            message.deviceId;

                        const deviceType =
                            message.deviceType;


                        if (
                            devices[deviceId]
                        ) {

                            try {

                                devices[
                                    deviceId
                                ].socket.close();

                            }
                            catch (_) {
                            }
                        }


                        devices[
                            deviceId
                        ] = {

                            socket: ws,

                            type:
                                deviceType
                        };


                        console.log(
                            "REGISTERED:",
                            deviceId,
                            deviceType
                        );


                        // -------------------------------------
                        // PENDING MESSAGES
                        // -------------------------------------

                        for (
                            const msg of messages
                        ) {

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
                                }
                            }
                        }


                        return;
                    }


                    // =========================================
                    // TABLET MESSAGE
                    // =========================================

                    if (
                        message.type ===
                        "tablet_message"
                    ) {

                        const id =
                            crypto.randomUUID();


                        const newMessage = {

                            id,

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
                        }


                        return;
                    }


                    // =========================================
                    // MESSAGE ACK
                    // =========================================

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


                        if (
                            msg
                        ) {

                            msg.status =
                                "delivered";
                        }


                        return;
                    }


                    // =========================================
                    // LOCATION REQUEST
                    // =========================================

                    if (
                        message.type ===
                        "location_request"
                    ) {

                        const phoneId =
                            message.phoneID;


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

                                device.socket.send(

                                    JSON.stringify({

                                        type:
                                            "location_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            crypto.randomUUID()
                                    })

                                );
                            }
                        }


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
                    // NOTIFICATION
                    // =========================================

                    if (
                        message.type ===
                        "notification"
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

                        const phoneId =
                            message.phoneID;


                        let found =
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

                                found =
                                    true;


                                device.socket.send(

                                    JSON.stringify({

                                        type:
                                            "screen_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            crypto.randomUUID()
                                    })

                                );
                            }
                        }


                        if (
                            !found
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


                    // =========================================
                    // SCREEN FRAME
                    // =========================================

                    if (
                        message.type ===
                        "screen_frame"
                    ) {

                        sendToPhones(
                            message
                        );

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

                        const phoneId =
                            message.phoneID;


                        let found =
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

                                found =
                                    true;


                                device.socket.send(

                                    JSON.stringify({

                                        type:
                                            "camera_request",

                                        requestFrom:
                                            phoneId,

                                        requestId:
                                            crypto.randomUUID()
                                    })

                                );
                            }
                        }


                        if (
                            !found
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


                    // =========================================
                    // CAMERA FRAME
                    // =========================================

                    if (
                        message.type ===
                        "camera_frame"
                    ) {

                        sendToPhones(
                            message
                        );

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
                catch (
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

                for (
                    const id in devices
                ) {

                    if (
                        devices[id].socket ===
                        ws
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


// =====================================================
// SEND TO ALL PHONES
// =====================================================

function sendToPhones(
    message
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

            try {

                device.socket.send(
                    JSON.stringify(
                        message
                    )
                );

            }
            catch (
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
// SEND TO ONE DEVICE
// =====================================================

function sendToDevice(
    deviceId,
    message
) {

    const device =
        devices[deviceId];


    if (
        device &&
        device.socket.readyState ===
        1
    ) {

        try {

            device.socket.send(
                JSON.stringify(
                    message
                )
            );

        }
        catch (
            error
        ) {

            console.log(
                "DEVICE SEND ERROR:",
                error.message
            );
        }
    }
}
