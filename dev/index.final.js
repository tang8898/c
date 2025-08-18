const {
    app,
    BrowserWindow,
    session,
    ipcMain,
    screen,
    nativeTheme,
    Menu,
    dialog,
  } = require("electron");
const io = require("socket.io-client");
const path = require("node:path");
const { EventEmitter } = require("events");
const crypto = require("crypto");
const mainWindow2Array = [];
const socket = io();
var socketStatus = false;
var userAgent =
    "Mozilla/5.0 (Windows" +
    "\x20NT\x2010.0;\x20" +
    "Win64;\x20x64" +
    ") AppleWebKit/537.36" +
    " (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const createWindow = () => {
  let __mainWindow;

    _0x406c92 = {
      NUetQ: "BrowserID",
      WquUj: "connect",
      gaKdr: "socket-status-updated",
      XxZeB: "disconnect",
      JGWad: function (_0x374d9f, _0x4875f0) {
        return _0x374d9f < _0x4875f0;
      },
      nPvZt: function (_0x5b4975, _0x19ed56, _0x241b2e) {
        return _0x5b4975(_0x19ed56, _0x241b2e);
      },
      Uriac: "Get_Browser_HTML",
      UDmfV: function (_0x4bcda5, _0x4c27c3) {
        return _0x4bcda5(_0x4c27c3);
      },
      FwQrz:
        "document.documentElement.outerHTML",
      HWVVC: function (_0x5dffef) {
        return _0x5dffef();
      },
      vUsnr: "Storage\x20da" + "ta cleared" + "!",
      KTcYz: "Cache\x20clea" + "red!",
      Zsnjn: "cookies",
      UnyCW: "websql",
      hNBYl: "serviceworkers",
      YsCXW: "temporary",
      mcURB: "persistent",
      YwVlT: "syncable",
      GAzAO: "BB_WEB_Resource",
      ygWvV: function (_0x3c14a6, _0x160ebe) {
        return _0x3c14a6(_0x160ebe);
      },
      ExUqB: "Fetch.getResponseBody",
      FhHgp: "BB_Browser_body",
      iNkKT: "Fetch.continueRequest",
      PWioS: "Network.requestWillBeSentExtraInfo",
      KvuUK: "BEIBEI_send_info",
      VMvLx: function (_0x3d5a7c, _0x353a11) {
        return _0x3d5a7c === _0x353a11;
      },
      gTgqJ: "Network.requestWillBeSent",
      vAulE: "BEIBEI_send",
      dtvXi: function (_0x105dd3, _0x4cfe26) {
        return _0x105dd3 === _0x4cfe26;
      },
      CXsJb: "Network.requestServedFromCache",
      awkRZ: "Network.responseReceived",
      vTRRd: "icon.ico",
      FCMhK: function (_0x27b4b5, _0x57250) {
        return _0x27b4b5 * _0x57250;
      },
      FfyWf: "preload2.js",
      rAyFg: "1.3",
      dMeZz: "Fetch.enable",
      QTpzA: "Request",
      yvREZ: "message",
      XyoLU: "Network.enable",
      NNrYQ: "dom-ready",
      wJNyH: function (_0x29294a, _0x34aa70) {
        return _0x29294a(_0x34aa70);
      },
      XWcWR: function (_0x5834fb, _0x285f38) {
        return _0x5834fb * _0x285f38;
      },
      bMWtx: "closed",
      UkYkB: function (_0x5485e3, _0x3324fa) {
        return _0x5485e3 !== _0x3324fa;
      },
      KLLER: "deny",
      hPhZI: function (_0x292ab4, _0x3cddcc) {
        return _0x292ab4 * _0x3cddcc;
      },
      KMNRg: "Set_Cookie",
      rbZHm: function (_0x1767ce, _0x4a11b2) {
        return _0x1767ce instanceof _0x4a11b2;
      },
      pTXbk: "User-Agent",
      eKabN: function (_0xe58335, _0x3d198b) {
        return _0xe58335(_0x3d198b);
      },
      aAzLT: "second-instance",
      hEsVm: function (_0x3890ea, _0x58afe4) {
        return _0x3890ea * _0x58afe4;
      },
      vsAQp: "Cache:",
      hYdeU: "clearCache",
      kQvPx: "BrowserSetUA",
      CmpAE: "Get_Browser_List",
      UUAcL: "Get_Browser_OpenNewWindow",
      zKuwq: "clear-cache",
      wOiXU: "OpenURL",
      vkvht: "index.html",
    };

  const _0x51ba7a = { myKey: "BEIBEI_APP_Browser" };
const _0x9dbe0d =
      app.requestSingleInstanceLock(_0x51ba7a);
  !_0x9dbe0d
    ? app.quit()
    : app.on(
        "second-instance",
        (_0x305519, _0xdb270a, _0x175677, _0x3b4b94) => {

          if (__mainWindow) {
            if (__mainWindow.isMinimized()) __mainWindow.restore();
            __mainWindow.focus();
          }
        },
      );
  const { width: _0x5010e4, height: _0x514de9 } =
    screen.getPrimaryDisplay().workAreaSize;
  ((__mainWindow = new BrowserWindow({
    icon: "icon.ico",
    width: Math.floor(
      _0x5010e4 * (-0x2445 + -0x1b15 + 0x33 * 0x13e + 0.25),
    ),
    height: Math.floor(
      (_0x514de9 * -0x1 * -0xee9 + 0x1751 + -0x263a + 0.25),
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  })),
    __mainWindow.setMenu(null));
  const _0x495c9f = app.getPath("cache");
  (console.log("Cache:", _0x495c9f),
    socket.on("connect", () => {

      (socket.emit("BrowserID", "true"),
        (socketStatus = true),
        __mainWindow.webContents.send(
          "socket-status-updated",
          socketStatus,
        ),
        console.log("connect"));
    }),
    socket.on("disconnect", () => {

      ((socketStatus = false),
        __mainWindow.webContents.send(
          "socket-status-updated",
          socketStatus,
        ),
        console.log("disconnect"),
        app.quit());
    }),
    socket.on("clearCache", () => {

      (clearCache(), socket.emit("clearCacheOK", "ok"));
    }),
    socket.on("BrowserSetUA", function (_0x48ba74) {
      userAgent = _0x48ba74;
    }),
    socket.on("Get_Browser_HTML", async function (_0x357268) {

      var _0x368b7d = [];
var _0x1420ac = JSON.parse(_0x357268);
      for (
        let _0x237fe0 = -0x11 * 0xe3 + -0x2 * -0x1153 + -0x1393;
        (_0x237fe0 < _0x1420ac.url.length);
        _0x237fe0++
      ) {
        try {
          const _0x5e5909 = _0x1420ac.url[_0x237fe0];
- const _0x3d9885 = await (_0x208517(_0x5e5909, _0x1420ac.delayTime));
+ const _0x3d9885 = await (fetchWindowSnapshot(_0x5e5909, _0x1420ac.delayTime));
          var _0x1e0026 = {
            id: _0x3d9885.id,
            url: _0x3d9885.urlb,
            title: _0x3d9885.webContents.getTitle(),
            html: _0x3d9885.html,
          };
          _0x368b7d.push(_0x1e0026);
        } catch (_0x332080) {
          console.error(_0x332080);
        }
      }
      const _0x135a86 = {
        clientID: _0x1420ac.id,
        List: _0x368b7d,
        mode: _0x1420ac.mode,
        uuid: _0x1420ac.uuid,
      };
      socket.emit(
        "Get_Browser_HTML",
        (encryptData(JSON.stringify(_0x135a86)),
        ),
      );
    }),
    socket.on("Get_Browser_List", function (_0x66baaa) {

      var _0x5bb8ab = JSON.parse(_0x66baaa);
var _0x31e8a9 = [];
      for (
        let _0x4172db = -0x1780 + 0x3 * -0x152 + -0x25 * -0xbe;
        _0x4172db < mainWindow2Array.length;
        _0x4172db++
      ) {
        var _0x2c1be3 = {
          id: mainWindow2Array[_0x4172db].id,
          url: mainWindow2Array[_0x4172db].webContents.getURL(),
          title:
            mainWindow2Array[_0x4172db].webContents.getTitle(),
        };
        _0x31e8a9.push(_0x2c1be3);
      }
      const _0x1759d0 = { clientID: _0x5bb8ab.id, List: _0x31e8a9 };
      socket.emit(
        "Get_Browser_List",
        (encryptData(JSON.stringify(_0x1759d0))),
      );
    }),
    socket.on("Get_Browser_OpenNewWindow", async function (_0x58f297) {

      var _0x411040 = JSON.parse(_0x58f297);
      for (
        let _0x442151 = -0x755 * -0x5 + 0x293 * -0x8 + -0x1011;
        (_0x442151 < _0x411040.url.length);
        _0x442151++
      ) {
        try {
          const _0xff5f76 = _0x411040.url[_0x442151];
-          (_0x18aedf(_0xff5f76));
+          (openWindow(_0xff5f76));
         } catch (_0x301974) {
          console.error(_0x301974);
        }
      }
    }),
    socket.on(
      "Get_Browser_Window_HTML",
      async function (_0x57c51d) {

        var _0x12875c = JSON.parse(_0x57c51d);
        const _0x4a417b = mainWindow2Array.find(
          (_0xc95010) => _0xc95010.id == _0x12875c.window,
        );
        if (_0x4a417b) {
          const _0x559940 = await _0x4a417b.webContents.executeJavaScript("document.documentElement.outerHTML");
const _0x5cc814 = {
              clientID: _0x12875c.id,
              html: _0x559940,
              url: _0x4a417b.webContents.getURL(),
              title: _0x4a417b.webContents.getTitle(),
            };
          socket.emit(
            "Get_Browser_Window_HTML",
            encryptData(JSON.stringify(_0x5cc814)),
          );
        }
      },
    ),
    ipcMain.handle(
      "clear-cache",
      async (_0x295243) => {

        (clearCache());
      },
    ),
    (clearCache = () => {

let _0xe41088 = session.defaultSession;
      (_0xe41088.clearCache(() => {

        console.log("Cache\x20clea");
      }),
        _0xe41088.clearStorageData(
          {
            storages: [
              "cookies",
              "localstorage",
              "indexdb",
              "websql",
              "serviceworkers",
            ],
            quotas: [
              "temporary",
              "persistent",
              "syncable",
            ],
          },
          () => {

            console.log("Storage\x20da");
          },
        ),
        console.log("Cache\x20clea"));
    }),
    socket.on("OpenURL", async function (_0x401e8d) {

const _0x58eee8 = {
          ZqzML: "BB_WEB_Resource",
          SuDrZ: function (_0x150d50, _0x5f5443) {

            return (_0x150d50(_0x5f5443));
          },
          lVtGg: "Fetch.getResponseBody",
          txgse: "BB_Browser_body",
          DbjTB: "Fetch.continueRequest",
          iAdAp: "Network.requestWillBeSentExtraInfo",
          coBud: "BEIBEI_send_info",
          JfcBS: function (_0x203d82, _0xa3aeba) {

            return (_0x203d82 === _0xa3aeba);
          },
          fOnyU: "Network.requestWillBeSent",
          RsHrJ: "BEIBEI_send",
          JKQfP: function (_0x487d51, _0x3c4ca4) {

            return (_0x487d51 === _0x3c4ca4);
          },
          OuhAw: "Network.requestServedFromCache",
          oJklE: "Network.responseReceived",
          MzpAP: function (_0xbbf61e, _0x41594b) {
            return _0xbbf61e === _0x41594b;
          },
        },
        _0x1f9090 = new BrowserWindow({
          icon: "icon.ico",
          width: Math.floor(
            (_0x5010e4 * -0x97 * 0x13 + -0x8e7 * 0x3 + 0x25ea * 0x1 + 0.6),
          ),
          height: Math.floor(
            (_0x514de9 * 0x1417 + 0x745 * 0x5 + -0x3870 + 0.6),
          ),
          webPreferences: {
            preload: path.join(__dirname, "preload2.js"),
            nodeIntegration: true,
          },
        });
      try {
        _0x1f9090.webContents.debugger.attach(
          "1.3",
        );
      } catch (_0xfb632a) {
        console.log(
          "Debugger\x20a" + "ttach fail" + "ed: ",
          _0xfb632a,
        );
      }
      (_0x1f9090.webContents.debugger.sendCommand(
        "Fetch.enable",
        { urlPattern: "*", requestStage: "Request" },
      ),
        _0x1f9090.webContents.debugger.on(
          "message",
          async (_0x5db6e1, _0x32120b, _0x47889a) => {

            if (_0x32120b === "Fetch.requestPaused") {
              ((_0x47889a.bbmode = "BEIBEI_send"),
                socket.emit(
                  "BB_WEB_Resource",
                  _0x58eee8.SuDrZ(
                    encryptData,
                    JSON.stringify(_0x47889a),
                  ),
                ));
              try {
                const _0x59bb98 = await _0x1f9090.webContents.debugger.sendCommand("Fetch.getResponseBody", {
                  requestId: _0x47889a.requestId,
                });
                ((_0x47889a.mode = "ResponseBody"),
                  (_0x47889a.ResponseBody = _0x59bb98),
                  socket.emit(
                    "BB_Browser_body",
                    encryptData(JSON.stringify(_0x47889a)),
                  ));
              } catch (_0x3ced8b) {}
              await _0x1f9090.webContents.debugger.sendCommand("Fetch.continueRequest", { requestId: _0x47889a.requestId });
            }
            if (_0x32120b === "Network.requestWillBeSentExtraInfo") {
              _0x47889a.bbmode = "BEIBEI_send_info";
              var _0x44ef83 = JSON.stringify(_0x47889a);
            }
            if (
              _0x58eee8.JfcBS(
                _0x32120b,
                "Network.requestWillBeSent",
              )
            ) {
              _0x47889a.bbmode = "BEIBEI_send";
              var _0x4e3918 = JSON.stringify(_0x47889a);
              socket.emit(
                "BB_WEB_Resource",
                _0x58eee8.SuDrZ(encryptData, _0x4e3918),
              );
            }
            if (
              _0x58eee8.JKQfP(
                _0x32120b,
                "Network.requestServedFromCache",
              )
            ) {
            }
            _0x32120b === "Network.responseReceived" &&
              (_0x47889a.bbmode = "BEIBEI_send");
            if (
              (_0x32120b === "Network.loadingFinished")
            ) {
            }
          },
        ),
        _0x1f9090.webContents.debugger.sendCommand(
          "Network.enable",
        ),
        _0x1f9090.loadURL(
          (addHttpPrefixIfMissing(_0x401e8d)),
        ),
        _0x1f9090.webContents.once(
          "dom-ready",
          async () => {

            if (_0x1f9090) {
              if (_0x1f9090.isMinimized())
                __mainWindow.restore();
              (_0x1f9090.focus(),
                _0x1f9090.setAlwaysOnTop(true),
                _0x1f9090.setAlwaysOnTop(false));
            }
          },
        ));
    }));
  function openWindow(_0xa78df3) {

const _0x25b51b = {
        aMvQf: function (_0x3a999e, _0x213eca) {

          return (_0x3a999e(_0x213eca));
        },
        FxexF: "deny",
        JQrmk: function (_0x3e2a61, _0x5732f4) {

          return (_0x3e2a61 < _0x5732f4);
        },
      },
      _0x151d3d = new BrowserWindow({
        width: Math.floor(
          (_0x5010e4 * -0x1c74 + -0x12fa + 0x2f6e + 0.6),
        ),
        height: Math.floor(_0x514de9 * (0x171 + 0x71 * 0xa + -0x5db + 0.6)),
        webPreferences: {
          preload: path.join(__dirname, "preload2.js"),
          nodeIntegration: true,
        },
      });
    ((_0x151d3d.urlb = _0xa78df3),
      _0x151d3d.webContents.setWindowOpenHandler(
        ({ url: _0xd51bef }) => {

          return (
            console.log(_0xd51bef),
            _0x151d3d.loadURL(
              _0x25b51b.aMvQf(addHttpPrefixIfMissing, _0xd51bef),
            ),
            { action: "deny" }
          );
        },
      ),
      _0x151d3d.loadURL(addHttpPrefixIfMissing(_0xa78df3)),
      _0x151d3d.webContents.once(
        "dom-ready",
        async () => {

const _0x426470 = await _0x151d3d.webContents.executeJavaScript(
              "document.documentElement.outerHTML",
            );
          _0x151d3d.html = _0x426470;
          for (
            let _0x1a9d06 = -0x12f * -0x2 + -0x807 * -0x1 + -0x3 * 0x377;
            _0x25b51b.JQrmk(
              _0x1a9d06,
              mainWindow2Array.length,
            );
            _0x1a9d06++
          ) {
            console.log(
              mainWindow2Array[_0x1a9d06].webContents.getTitle(),
            );
          }
          if (_0x151d3d) {
            if (_0x151d3d.isMinimized())
              __mainWindow.restore();
            (_0x151d3d.focus(),
              _0x151d3d.setAlwaysOnTop(true),
              _0x151d3d.setAlwaysOnTop(false));
          }
          mainWindow2Array.push(_0x151d3d);
        },
      ),
      _0x151d3d.on("closed", () => {

const _0x40ad54 = mainWindow2Array.indexOf(_0x151d3d);
        if (_0x40ad54 !== -(0xb33 + 0x1e44 + -0x1 * 0x2976))
          mainWindow2Array.splice(
            _0x40ad54,
            0xada * 0x2 + -0x25cc + 0x1 * 0x1019,
          );
      }));
  }
  function fetchWindowSnapshot(_0x407e57, _0x55a2ac) {

const _0x21fa9e = {
        xBKRG: function (_0x34733a, _0x557fcf) {

          return (_0x34733a !== _0x557fcf);
        },
        GIcvd: function (_0x3ba74e, _0x545eb9) {

          return (_0x3ba74e(_0x545eb9));
        },
        zhzxB: "deny",
        EkpKb: function (_0x15662b, _0xb50da1) {

          return (_0x15662b * _0xb50da1);
        },
        DynPh: "document.documentElement.outerHTML",
        aaJJJ: function (_0x41c9f3, _0x290f33) {

          return (_0x41c9f3 * _0x290f33);
        },
        QJtRO: "preload2.js",
        UFeSQ: "dom-ready",
      };
    return new Promise((_0x5f3838, _0x1edf07) => {

const _0x5304ff = {
          bOIZP: function (_0x1207db, _0x411d4b) {

            return _0x21fa9e.GIcvd(_0x1207db, _0x411d4b);
          },
          QdNAy: _0x21fa9e.zhzxB,
          QxCmw: function (_0x5ddedf, _0x2ad7d0) {

            return _0x21fa9e.GIcvd(_0x5ddedf, _0x2ad7d0);
          },
          dCxnC: function (_0x2bfa7b, _0x5641f8) {

            return _0x21fa9e.EkpKb(_0x2bfa7b, _0x5641f8);
          },
          zhLEn: _0x21fa9e.DynPh,
        };
      var _0xe8cd3e = "";
      const _0x31293d = new BrowserWindow({
        width: Math.floor(
          _0x21fa9e.aaJJJ(
            _0x5010e4,
            0x2453 + -0xd20 + -0x1733 + 0.6,
          ),
        ),
        height: Math.floor(
          _0x21fa9e.EkpKb(
            _0x514de9,
            -0x10b0 + -0x2f * -0x73 + 0x67 * -0xb + 0.6,
          ),
        ),
        show: false,
        webPreferences: {
          preload: path.join(__dirname, "preload2.js"),
          nodeIntegration: true,
        },
      });
      (_0x31293d.webContents.setAudioMuted(
        true,
      ),
        (_0x31293d.urlb = _0x407e57),
        _0x31293d.webContents.setWindowOpenHandler(
          ({ url: _0x1e824d }) => {

            return (
              console.log(_0x1e824d),
              _0x31293d.loadURL(
                _0x5304ff.bOIZP(addHttpPrefixIfMissing, _0x1e824d),
              ),
              { action: _0x21fa9e.zhzxB }
            );
          },
        ),
        _0x31293d.loadURL(
          _0x21fa9e.GIcvd(addHttpPrefixIfMissing, _0x407e57),
        ),
        _0x31293d.webContents.once(
          "dom-ready",
          async () => {

            if (_0x31293d) {
              if (_0x31293d.isMinimized())
                __mainWindow.restore();
              (_0x31293d.focus(),
                _0x31293d.setAlwaysOnTop(true),
                _0x31293d.setAlwaysOnTop(false));
            }
            (await _0x5304ff.QxCmw(
              delay,
              _0x5304ff.dCxnC(
                _0x55a2ac,
                -0x37 * 0x5 + 0x19eb + -0x218 * 0xa,
              ),
            ),
              (_0xe8cd3e = await _0x31293d.webContents.executeJavaScript(_0x21fa9e.DynPh)),
              (_0x31293d.html = _0xe8cd3e),
              _0x5304ff.QxCmw(_0x5f3838, _0x31293d),
              _0x31293d.close());
          },
        ),
        _0x31293d.on("closed", () => {

const _0x52c0a7 = mainWindow2Array.indexOf(_0x31293d);
          if (
            _0x21fa9e.xBKRG(
              _0x52c0a7,
              -(-0x149 * -0x7 + 0xd68 + 0x2f * -0x7a),
            )
          )
            mainWindow2Array.splice(
              _0x52c0a7,
              -0x2513 * -0x1 + -0xca * -0x29 + -0x6 * 0xb92,
            );
        }));
    });
  }
  socket.on("GetCookis", async function (_0x5da44b) {

    var _0x546294 = JSON.parse(_0x5da44b);
    const _0x4da95e = await session.defaultSession.cookies.get({ url: _0x546294.url });
const _0x2ad56b = {
        clientID: _0x546294.clientID,
        url: _0x546294.url,
        cookie: _0x4da95e,
      };
const _0x2c3676 = JSON.stringify(_0x2ad56b);
    socket.emit("Set_Cookie", _0x2c3676);
  });
  const _0x2ad36c = { urls: ["<all_urls>"] };
  (session.defaultSession.webRequest.onCompleted(_0x2ad36c, (_0x2b09ee) => {}),
    session.defaultSession.webRequest.onBeforeSendHeaders(_0x2ad36c, (_0x4236a9, _0x1aa89a) => {

((_0x4236a9.requestHeaders[
        "User-Agent"
      ] = userAgent),
        (_0x1aa89a({
          cancel: false,
          requestHeaders: _0x4236a9.requestHeaders,
        })));
    }),
    session.defaultSession.webRequest.onErrorOccurred(_0x2ad36c, (_0x3e6b61) => {}),
    __mainWindow.loadFile("index.html"),
    __mainWindow.webContents.once(
      "dom-ready",
      () => {

        (__mainWindow.focus(),
          __mainWindow.setAlwaysOnTop(true),
          __mainWindow.setAlwaysOnTop(false),
          __mainWindow.webContents.send(
            "socket-status-updated",
            socketStatus,
          ));
      },
    ));
};
(app.whenReady().then(() => {

(createWindow(),
    app.on("activate", () => {

-      if (
-        (BrowserWindow.getAllWindows().length,
-          0x1dc1 + -0xb16 + -0x12ab,
-        )
-      )
-        (createWindow());
+      // Only create a new window if none are open
+      if (BrowserWindow.getAllWindows().length === 0) createWindow();
     }));
 }),
  app.on("window-all-closed", () => {

 socket.emit("BrowserID", "false");
    if (
      (process.platform !== "darwin")
    )
      app.quit();
  }));
function addHttpPrefixIfMissing(_0x5d9c37) {

return (
    !_0x5d9c37.startsWith("http://") &&
      !_0x5d9c37.startsWith("https://") &&
      (_0x5d9c37 = ("http://" + _0x5d9c37)),
    _0x5d9c37
  );
}
function encryptData(_0x2ef7be) {

const _0x175749 = "XBEIBEIX.C0M0427";
const _0x394322 = Buffer.from(
      _0x175749.slice(
        0x1dff + 0xfad * -0x1 + -0xe52 * 0x1,
        -0xf59 * 0x1 + 0x1fea + -0xa9 * 0x19,
      ),
      "utf-8",
    );
const _0x35f700 = Buffer.from(
      _0x175749.slice(
        -0x1 * 0xaa9 + 0x1bf2 + -0x1149,
        -0x5 * -0x132 + 0x1 * 0x1f2 + 0x3ee * -0x2,
      ),
      "utf-8",
    );
const _0x11c068 = crypto.createCipheriv(
      "aes-128-cbc",
      _0x394322,
      _0x35f700,
    );
  let _0x2bbaa6 = _0x11c068.update(
    _0x2ef7be,
    "utf-8",
    "base64",
  );
  return (_0x2bbaa6 += _0x11c068.final("base64"), _0x2bbaa6);
}
function delay(_0x53ac4f) {
  return new Promise((_0x253656) => setTimeout(_0x253656, _0x53ac4f));
}