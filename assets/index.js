"use strict";
//python2 -m SimpleHTTPServer in case if device disconnects will run simple server and it should work

var uDevice;

// const handleSuccess = function(stream) {
//    if (window.URL) {
//       player.srcObject = stream;
//    } else {
//       player.src = stream;
//    }
//  };

//  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
//      .then(handleSuccess);

// 传输方向 vendor
// 0 = 主机向设备
// 1 = 设备至主机
let requestType = 0
// device, interface, endpoint, or other.
// #define 	USB_SETUP_RECIPIENT_DEVICE   0x00
 
// #define 	USB_SETUP_RECIPIENT_INTERFACE   0x01
 
// #define 	USB_SETUP_RECIPIENT_ENDPOINT   0x02
 
// #define 	USB_SETUP_RECIPIENT_OTHER   0x03
let recipient = 0

let credetials = []

// document
//   .querySelector("#request-aoa")
//   .addEventListener("click", async function (event) {
//     const device = await navigator.usb
//       .requestDevice({
//         filters: [
//         //   { vendorId: 0x18d1, productId: 0x2d00 },
//         //   { vendorId: 0x18d1, productId: 0x2d01 },
//         //   { vendorId: 0x18d1, productId: 0x2d02 },
//         //   { vendorId: 0x18d1, productId: 0x2d03 },
//         //   { vendorId: 0x18d1, productId: 0x2d04 },
//         //   { vendorId: 0x18d1, productId: 0x2d05 },
//         ],
//       })
//       .then((usbDevice) => {
//         console.log("Product name: " + usbDevice.productName);
//         return usbDevice
//       })
//       .catch((e) => {
//         console.log("There is no aoa device. " + e);
//       });

//       await setupPipes(usbDevice);

//       await subscribeForRead();
//   });

// document
//   .querySelector("#request-any")
//   .addEventListener("click", ;

async function connect(usbDevice) {
  await usbDevice
    .open()
    .then(function () {
      console.log("connected");
    })
    .catch((e) => {
      console.log("Can't connect " + e);
    });
}

async function checkProtocol(usbDevice) {
//   if (usbDevice.configuration === null)
    return await usbDevice
      .selectConfiguration(1)
      .then(function () {
        console.log('send data')
        usbDevice
          .controlTransferIn(
            {
              requestType: requestType,
              recipient: recipient,
              request: 51,
              value: 0,
              index: 0,
            },
            2
          )
          .then((response) => {
            console.log("Check protocol status:", response.data, response.status);
            if (response.data.getInt8(0) == 2) {
              console.log("AoA2 available");
              return true
            }
          })
          .catch((e) => {
            console.log("Can't send " + e);
          });
      })
      .catch((e) => {
        console.log("Can't select " + e);
      });
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

async function setCredentials(usbDevice) {
  // let credetials = [
  //   "once2go",
  //   "WebUsbChat",
  //   "desCripTion",
  //   "1.0",
  //   "uri",
  //   "seRialNuMbeR",
  // ];

  for (var i = 0; i < credetials.length; i++) {
    let cred = new TextEncoder().encode(credetials[i]);
    await usbDevice.controlTransferOut(
      {
        requestType: requestType,
        recipient: recipient,
        request: 52,
        value: 0,
        index: i,
      },
      cred
    );
  }
  if (document.getElementById("audio-support").checked) {
    setupAudio(usbDevice);
  } else {
    switchToAoA(usbDevice);
  }
}

function setupAudio(usbDevice) {
  console.log("Setup audio");
  usbDevice
    .controlTransferOut(
      {
        requestType: requestType,
        recipient: recipient,
        request: 58,
        value: 1,
        index: 0,
      },
      new ArrayBuffer(0)
    )
    .then((response) => {
      if (response.status == "ok") {
        switchToAoA(usbDevice);
      }
    })
    .catch((e) => {
      console.log("Can't send " + e);
    });
}

function switchToAoA(usbDevice) {
  console.log("Switch to AoA");
  usbDevice
    .controlTransferOut(
      {
        requestType: requestType,
        recipient: recipient,
        request: 53,
        value: 0,
        index: 0,
      },
      new ArrayBuffer(0)
    )
    .then((response) => {
        console.log("Switch to AoA", response, response.status);
      if (response.status == "ok") {
        usbDevice.close();
      }
    })
    .catch((e) => {
      console.log("Can't send " + e);
    });
}

async function setupPipes(usbDevice) {
  await usbDevice.open();
  if (usbDevice.configuration === null) await usbDevice.selectConfiguration(1);
  await usbDevice.claimInterface(0);
  console.log("interfaces:" + usbDevice.configuration.interfaces.length);
  for (var i = 0; i < usbDevice.configuration.interfaces.length; i++) {
    var iface = usbDevice.configuration.interfaces[i];
    if (iface.claimed) {
      console.log(iface.alternate.endpoints);
    }
  }
  uDevice = usbDevice;
}

function subscribeForRead() {
  uDevice
    .transferIn(1, 64)
    .then((response) => {
      var str_response = String.fromCharCode.apply(
        null,
        new Uint8Array(response.data.buffer)
      );
      console.log('str_response', str_response);
      var n = str_response.indexOf(String.fromCharCode(0));
      console.log(str_response.substring(0, n));
      var chatText = document.querySelector("#chat-area").value;
      document.querySelector("#chat-area").value =
        "phone->" + str_response.substring(0, n) + "\n" + chatText;
      subscribeForRead();
    })
    .catch((e) => {
      console.log("Can't read" + e);
    });
}

document.querySelector("#send").addEventListener("click", function (event) {
  var text = document.querySelector("#text-inpt").value;
  uDevice
    .transferOut(1, str2ab(text))
    .then((response) => {
      console.log(response);
      document.querySelector("#text-inpt").value = "";
      var chatText = document.querySelector("#chat-area").value;
      document.querySelector("#chat-area").value =
        "you->" + text + "\n" + chatText;
    })
    .catch((e) => {
      console.log("Can't send " + e);
    });
});


const app = new Vue({
  el: '#vueapp',
  data() {
      return {
          loggers: [],
          hasPort: false,
          port: {},
          portInfo: {},
          recipient,
          requestType: requestType,
          credetials: [
            { name: 'manufacturer', val: ''},
            { name: 'model', val: ''},
            { name: 'description', val: ''},
            { name: 'version', val: '2.0'},
            { name: 'uri', val: 'uri'},
            { name: 'serial', val: ''},
          ]
      }
  },
  mounted() {
    console.log('navigator', window.navigator)

    this.onUsbConnect()
    this.onSrialConnect()
  },
  computed: {
    isSupportSerial() {
      return !!window.navigator.serial
    }
  },
  watch: {
    recipient(v) {
      recipient = v
    },
    requestType(v) {
      requestType = v
    },
    credetials: {
      deep:true,
      handler(v){
        const cs = []
        this.credetials.map(i => {
          cs.push(i.val)
        })
        credetials = cs
      }
    }
  },
  methods: {
      changeRequestType() {
        this.requestType = this.requestType ? 0 : 1
        requestType = this.requestType
      },
      onSrialConnect() {
        if (!this.isSupportSerial) return
        navigator.serial.onconnect = function (...args) {
          console.log('serial', args)
        }
      },
      onUsbConnect() {
        navigator.usb.onconnect = function (...args) {
          console.log('usb devices', args)
        }
      },

      async connectSerial() {
        if (this.port && this.port.getInfo) {
          this.portInfo = await this.port.getInfo();
        } else {
          await this.requestSerial()
        }
      },
      async requestSerial() {
        if (!this.isSupportSerial) return

        const ports = await window.navigator.serial.requestPort()
        console.log('ports', ports)
        this.port = ports
        this.hasPort = true
      },
      log() {
          // const message = 
      },
      async reqUsbAny(event) {
        const usbDevice = await navigator.usb
          .requestDevice({ filters: [] })
          .then((usbDevice) => {
            console.log("Product name: " + usbDevice.productName);
            
            console.log('devices: ', usbDevice)
            return usbDevice
          })
          .catch((e) => {
            console.log("There is no device. " + e);
          });
        if (!usbDevice) return
        await connect(usbDevice);
        await checkProtocol(usbDevice);
        await setCredentials(usbDevice);
      },
      async reqAoa() {

        const device = await navigator.usb
        .requestDevice({
          filters: [
          //   { vendorId: 0x18d1, productId: 0x2d00 },
          //   { vendorId: 0x18d1, productId: 0x2d01 },
          //   { vendorId: 0x18d1, productId: 0x2d02 },
          //   { vendorId: 0x18d1, productId: 0x2d03 },
          //   { vendorId: 0x18d1, productId: 0x2d04 },
          //   { vendorId: 0x18d1, productId: 0x2d05 },
          ],
        })
        .then((usbDevice) => {
          console.log("Product name: " + usbDevice.productName);
          return usbDevice
        })
        .catch((e) => {
          console.log("There is no aoa device. " + e);
        });

        if (!device) return

        await setupPipes(usbDevice);

        await subscribeForRead();
      }
  }
})