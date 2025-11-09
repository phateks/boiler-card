class BoilerCard extends HTMLElement {
  setConfig(config) {
    if (!config.image) throw new Error("Image path is required.");
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
          display: flex;
          justify-content: center;
          align-items: center;
          background: url(${c.image}) no-repeat center/contain;
          width: 300px;
          height: 480px;
          color: #fff;
          font-family: "Segoe UI", sans-serif;
        }

        .out, .in, .pressure {
          position: absolute;
          font-weight: bold;
        }

        .out {
          top: ${c.temp_top || "50px"};
          left: ${c.temp_out_left || "17%"};
          color: #ff6600;
        }

        .in {
          top: ${c.temp_top || "50px"};
          right: ${c.temp_in_right || "17%"};
          color: #33a1ff;
        }

        .pressure {
          top: ${c.pressure_top || "185px"};
          color: #ddd;
          font-size: 1.2em;
        }

        .flame {
          position: absolute;
          top: ${c.flame_top || "120px"};
          font-size: ${c.flame_size || "60px"};
          color: ${flameState ? "red" : "#444"};
          animation: ${flameState ? "pulse 1s infinite" : "none"};
          transition: color 0.3s ease;
        }

        @keyframes pulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.7; transform: scale(1); }
        }

        .temps {
          position: absolute;
          bottom: 20px;
          display: flex;
          width: 80%;
          justify-content: space-around;
        }

        .temp-block {
          text-align: center;
        }

        .btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 5px;
          width: 30px;
          height: 30px;
          color: white;
          font-size: 1.2em;
          line-height: 30px;
          margin: 3px;
          cursor: pointer;
          user-select: none;
        }

        .btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .value {
          font-size: 1.2em;
          font-weight: bold;
        }
      </style>

      <div class="boiler-card">
        <div class="out">OUT: ${outTemp}°C</div>
        <div class="in">IN: ${inTemp}°C</div>
        <ha-icon class="flame" icon="mdi:fire"></ha-icon>
        <div class="pressure">${pressure} bar</div>

        <div class="temps">
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

    // Event handlers
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

  _adjustTemp(hass, entityId, increase = true) {
    if (!entityId) return;
    const state = hass.states[entityId];
    if (!state) return;

    // water_heater entity
    if (entityId.startsWith("water_heater.")) {
      const current = state.attributes.temperature ?? state.attributes.current_temperature ?? state.state;
      const newTemp = increase ? Number(current) + 1 : Number(current) - 1;
      hass.callService("water_heater", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    }

    // climate entity
    else if (entityId.startsWith("climate.")) {
      const current = state.attributes.temperature ?? state.state;
      const newTemp = increase ? Number(current) + 1 : Number(current) - 1;
      hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    }

    // input_number or number entity
    else if (entityId.startsWith("input_number.") || entityId.startsWith("number.")) {
      const domain = entityId.split(".")[0];
      hass.callService(domain, increase ? "increment" : "decrement", {
        entity_id: entityId,
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
  description: "Smart boiler control panel with flame animation and temperature controls.",
});
