class BoilerCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    const c = this.config;
    const root = this.shadowRoot;
    if (!root) return;

    const flameState = hass.states[c.entities.flame]?.state === "on";
    const outTemp = hass.states[c.entities.out]?.state ?? "--";
    const inTemp = hass.states[c.entities.in]?.state ?? "--";
    const pressure = hass.states[c.entities.pressure]?.state ?? "--";
    const acm = c.entities.acm_temp ? hass.states[c.entities.acm_temp] : null;
    const heat = c.entities.heat_temp ? hass.states[c.entities.heat_temp] : null;

    root.innerHTML = `
      <style>
        .boiler-card {
          position: relative;
          width: 300px;
          height: 460px;
          border-radius: 12px;
          background: linear-gradient(to bottom, #f2f2f2 75%, #3a3a3a 75%);
          box-shadow: inset 0 0 0 2px #444;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Segoe UI", sans-serif;
        }

        .panel {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 120px;
          background: linear-gradient(to bottom, #3b3b3b, #2b2b2b);
          border-top-left-radius: 40px;
          border-top-right-radius: 40px;
          display: flex;
          justify-content: space-around;
          align-items: center;
        }

        .panel .temp-block {
          text-align: center;
          color: white;
        }

        .btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 5px;
          width: 30px;
          height: 30px;
          line-height: 30px;
          font-size: 1.2em;
          cursor: pointer;
          user-select: none;
          color: #fff;
        }

        .btn:hover { background: rgba(255,255,255,0.25); }

        .out, .in {
          position: absolute;
          top: ${c.temp_top || "50px"};
          font-weight: bold;
          font-size: 1.1em;
        }

        .out { left: ${c.temp_out_left || "17%"}; color: #ff6600; }
        .in { right: ${c.temp_in_right || "17%"}; color: #3399ff; }

        .flame {
          position: absolute;
          top: ${c.flame_top || "140px"};
          font-size: ${c.flame_size || "60px"};
          color: ${flameState ? "red" : "#555"};
          text-shadow: ${flameState ? "0 0 10px rgba(255,0,0,0.8)" : "none"};
          animation: ${flameState ? "pulse 1.2s infinite" : "none"};
          transition: all 0.3s ease;
        }

        @keyframes pulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.7; transform: scale(1); }
        }

        .pressure {
          position: absolute;
          top: ${c.pressure_top || "190px"};
          font-size: 1.2em;
          color: #444;
          font-weight: 500;
        }

        .pressure.low { color: #ff3333; }
        .pressure.high { color: #ff9933; }

      </style>

      <div class="boiler-card">
        <div class="out">OUT: ${outTemp}°C</div>
        <div class="in">IN: ${inTemp}°C</div>
        <ha-icon class="flame" icon="mdi:fire"></ha-icon>
        <div class="pressure ${pressure < 1 ? "low" : pressure > 2.5 ? "high" : ""}">
          ${pressure} bar
        </div>

        <div class="panel">
          <div class="temp-block">
            <div class="btn" id="acm_up">+</div>
            <div class="value">
              ${
                acm
                  ? (acm.attributes.current_temperature ??
                     acm.attributes.temperature ??
                     acm.state)
                  : "--"
              }°C
            </div>
            <div>ACM</div>
            <div class="btn" id="acm_down">−</div>
          </div>

          <div class="temp-block">
            <div class="btn" id="heat_up">+</div>
            <div class="value">
              ${heat ? heat.state : "--"}°C
            </div>
            <div>Heat</div>
            <div class="btn" id="heat_down">−</div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    root.querySelector("#acm_up")?.addEventListener("click", () =>
      this._adjustTemp(hass, c.entities.acm_temp, true)
    );
    root.querySelector("#acm_down")?.addEventListener("click", () =>
      this._adjustTemp(hass, c.entities.acm_temp, false)
    );
    root.querySelector("#heat_up")?.addEventListener("click", () =>
      this._adjustTemp(hass, c.entities.heat_temp, true)
    );
    root.querySelector("#heat_down")?.addEventListener("click", () =>
      this._adjustTemp(hass, c.entities.heat_temp, false)
    );
  }

  // fixed temperature adjustment logic
  _adjustTemp(hass, entityId, increase = true) {
    if (!entityId) return;
    const state = hass.states[entityId];
    if (!state) return;

    const current = Number(
      state.attributes.temperature ??
      state.attributes.current_temperature ??
      state.state
    );

    if (isNaN(current)) return;
    const newTemp = increase ? current + 1 : current - 1;

    // water_heater
    if (entityId.startsWith("water_heater.")) {
      hass.callService("water_heater", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    }

    // climate
    else if (entityId.startsWith("climate.")) {
      hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    }

    // number / input_number
    else if (entityId.startsWith("number.") || entityId.startsWith("input_number.")) {
      hass.callService("number", "set_value", {
        entity_id: entityId,
        value: newTemp,
      });
    }
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("boiler-card", BoilerCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "boiler-card",
  name: "Boiler Card",
  description: "Smart boiler control panel with CSS graphics and flame animation.",
});
