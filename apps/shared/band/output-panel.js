// output-panel.js — the "Outputs" panel for BandPlayer.output (BandOutputPanel.mount(el)).
// Stereo, or one channel per instrument for a mixing desk such as an X32 over USB.
// The routing itself is in player.js (search "output routing"); this only edits its settings.
(function (global){
  "use strict";
  function h(tag, attrs, kids){ var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k){ if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c){ e.appendChild(c); }); return e; }

  function mount(el){
    var O = global.BandPlayer && global.BandPlayer.output; if (!el || !O) return;
    el.innerHTML = "";
    var cfg = O.get();
    var mode = h("select", { id: "bo-mode" }, [ h("option", { value: "stereo", text: "Stereo (speakers, headphones)" }), h("option", { value: "multi", text: "One channel per instrument (mixing desk)" }) ]);
    var dev = h("select", { id: "bo-dev" }, [ h("option", { value: "", text: "System output" }) ]);
    var mix = h("input", { type: "checkbox", id: "bo-mix" });
    var status = h("p", { class: "bt-hint", role: "status" });
    var grid = h("div", { class: "bt-mixer", role: "group", "aria-label": "Channel for each instrument" });
    var row = h("div", { class: "bt-row" }, [
      h("div", { class: "bt-field" }, [ h("label", { for: "bo-mode", text: "Output" }), mode ]),
      h("div", { class: "bt-field" }, [ h("label", { for: "bo-dev", text: "Device" }), dev ]),
      h("div", { class: "bt-field" }, [ h("span", { class: "bt-group-label", text: "Channels 1–2" }), h("label", { class: "bt-check" }, [ mix, document.createTextNode(" The stereo mix as well") ]) ]),
      h("button", { type: "button", class: "bt-btn", id: "bo-check", text: "Check channels" }),
      h("button", { type: "button", class: "bt-btn", id: "bo-reset", text: "Default channels" })
    ]);
    el.appendChild(row); el.appendChild(grid); el.appendChild(status);

    function fill(){
      cfg = O.get(); mode.value = cfg.mode; mix.checked = cfg.mix !== false; dev.value = cfg.sink || "";
      grid.innerHTML = ""; grid.hidden = cfg.mode !== "multi"; mix.closest(".bt-field").hidden = cfg.mode !== "multi";
      O.sends().forEach(function (sd){
        var inp = h("input", { type: "number", min: "0", max: "32", value: String(cfg.map[sd.id] | 0), id: "bo-ch-" + sd.id, style: "width:4.5em" });
        inp.addEventListener("change", function (){ var m = {}; m[sd.id] = Math.max(0, Math.min(32, inp.value | 0)); O.set({ map: m }); say(); });
        grid.appendChild(h("div", { class: "bt-field" }, [ h("label", { for: inp.id, text: sd.label }), inp ]));
      });
      say();
    }
    function say(text){
      if (text){ status.textContent = text; return; }
      var c = O.get();
      status.textContent = c.mode === "multi"
        ? "Each instrument leaves dry (no room reverb, no compressor) on its own channel; 0 = not sent. The drum faders above still apply, the Drums volume does not. Changes apply from the next Play."
        : "The band plays as one stereo mix.";
    }
    function listDevices(){
      O.devices().then(function (list){
        list.forEach(function (d, i){ if (d.id === "default" || d.id === "") return;
          dev.appendChild(h("option", { value: d.id, text: d.label || ("Output " + (i + 1) + " (name hidden until the page may use the microphone)") })); });
        dev.value = O.get().sink || ""; });
    }
    if (!O.canChooseDevice()){ dev.disabled = true; dev.title = "This browser plays through the system output only: choose the X32 in the computer's sound settings (Chrome and Edge can choose here)."; }
    else listDevices();
    mode.addEventListener("change", function (){ O.set({ mode: mode.value }); fill(); });
    dev.addEventListener("change", function (){ O.set({ sink: dev.value }).then(function (){ say(); }); });
    mix.addEventListener("change", function (){ O.set({ mix: mix.checked }); });
    row.querySelector("#bo-reset").addEventListener("click", function (){ var d = O.get(); O.reset().then(function (){ O.set({ mode: d.mode, sink: d.sink, mix: d.mix }); fill(); }); });
    row.querySelector("#bo-check").addEventListener("click", function (){
      O.maxChannels().then(function (n){
        var c = O.get(), over = O.sends().filter(function (sd){ return (c.map[sd.id] | 0) > n; }).map(function (sd){ return sd.label; });
        say(n <= 2 ? "This output has 2 channels: only the stereo mix can be sent. Choose the mixing desk as the device, or as the computer's sound output."
          : "This output has " + n + " channels." + (over.length ? " Not sent (channel too high): " + over.join(", ") + "." : " Every instrument fits."));
      }, function (e){ say("Could not open the audio output: " + (e && e.message || e)); });
    });
    fill();
  }
  global.BandOutputPanel = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
