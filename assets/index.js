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


document
  .querySelector("#request-aoa")
  .addEventListener("click", function (event) {
    navigator.usb
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
        setupPipes(usbDevice);
      })
      .catch((e) => {
        console.log("There is no aoa device. " + e);
      });
  });

document
  .querySelector("#request-any")
  .addEventListener("click", function (event) {
    navigator.usb
      .requestDevice({ filters: [] })
      .then((usbDevice) => {
        console.log("Product name: " + usbDevice.productName);
        connect(usbDevice);
        console.log('devices: ', usbDevice)
      })
      .catch((e) => {
        console.log("There is no device. " + e);
      });
  });

function connect(usbDevice) {
  usbDevice
    .open()
    .then(function () {
      console.log("connected");
      checkProtocol(usbDevice);
    })
    .catch((e) => {
      console.log("Can't connect " + e);
    });
}

function checkProtocol(usbDevice) {
//   if (usbDevice.configuration === null)
    usbDevice
      .selectConfiguration(1)
      .then(function () {
        console.log('send data')
        usbDevice
          .controlTransferIn(
            {
              requestType: "vendor",
              recipient: "device",
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
              setCredentials(usbDevice);
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
  let credetials = [
    "once2go",
    "WebUsbChat",
    "desCripTion",
    "1.0",
    "uRi",
    "seRialNuMbeR",
  ];
  for (var i = 0; i < credetials.length; i++) {
    let cred = new TextEncoder().encode(credetials[i]);
    await usbDevice.controlTransferOut(
      {
        requestType: "vendor",
        recipient: "device",
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
        requestType: "vendor",
        recipient: "device",
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
        requestType: "vendor",
        recipient: "device",
        request: 53,
        value: 0,
        index: 0,
      },
      new ArrayBuffer(0)
    )
    .then((response) => {
        console.log("Switch to AoA", response.status);
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
  subscribeForRead();
}

function subscribeForRead() {
  uDevice
    .transferIn(1, 64)
    .then((response) => {
      var str_response = String.fromCharCode.apply(
        null,
        new Uint8Array(response.data.buffer)
      );
      console.log(str_response);
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
          portInfo: {}
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
  methods: {
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
      }
  }
})