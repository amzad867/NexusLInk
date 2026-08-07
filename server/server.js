const express = require("express");
const { WebSocketServer } = require("ws");


const app = express();


const PORT = process.env.PORT || 3000;



app.get("/", (req, res) => {

    res.send("Nexus Link Server Running");

});



const server = app.listen(PORT, () => {

    console.log(
        "Server running on port " + PORT
    );

});



const wss = new WebSocketServer({

    server

});



let devices = {};



wss.on("connection", (ws) => {


    console.log("Device Connected");



    ws.on("message", (data) => {


        try {


            let message = JSON.parse(data);



            console.log(
                "Received:",
                message
            );



            // DEVICE REGISTER

            if(message.type === "register"){


                devices[message.deviceId] = ws;



                console.log(

                    "Registered:",

                    message.deviceId

                );


            }




            // NORMAL SEND

            if(message.type === "send"){


                let target = devices[message.target];



                if(target){


                    target.send(

                        JSON.stringify(message)

                    );


                    console.log(

                        "Message sent:",

                        message.target

                    );


                }


            }





            // TABLET TO PHONE MESSAGE

            if(message.type === "tablet_message"){



                let phone = devices[message.phoneID];



                if(phone){



                    phone.send(

                        JSON.stringify({

                            type:"tablet_message",

                            message:message.message

                        })

                    );



                    console.log(

                        "Tablet message sent to phone"

                    );



                }else{


                    console.log(

                        "Phone not found:",

                        message.phoneID

                    );


                }


            }







            // PAIR SYSTEM

            if(message.type === "pair"){



                let tablet = devices[message.tabletID];



                if(tablet){



                    ws.send(JSON.stringify({

                        type:"pair_success",

                        tabletID:message.tabletID

                    }));




                    tablet.send(JSON.stringify({

                        type:"pair_request",

                        phoneID:message.phoneID

                    }));



                    console.log(

                        "Pair request sent"

                    );



                }else{



                    ws.send(JSON.stringify({

                        type:"pair_failed",

                        message:"Tablet not found"

                    }));



                }



            }




        } catch(error){


            console.log(

                "Message Error:",

                error.message

            );


        }



    });







    ws.on("close", () => {



        console.log(

            "Device Disconnected"

        );



        // remove disconnected device


        for(let id in devices){


            if(devices[id] === ws){


                delete devices[id];


                console.log(

                    "Removed:",

                    id

                );


            }


        }



    });




});
