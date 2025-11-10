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
          height: 380px; /* redus de la 460px */
          border-radius: 12px;
          background: linear-gradient(to bottom, #f2f2f2 68%, #2f2f2f 68%);
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
          height: 110px;
          background: linear-gradient(to bottom, #3b3b3b, #2b2b2b);
          border-top-left-radius: 35px;
          border-top-right-radius: 35px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 25px;
        }

        .temp-block {
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100px;
        }

        .value {
          font-size: 1.4em;
          font-weight: 600;
          margin: 6px 0;
        }

        .btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          width: 45px;
          height: 45px;
          line-height: 45px;
          font-size: 1.5em;
          cursor: pointer;
          user-select: none;
          color: #fff;
          transition: background 0.2s ease;
        }

        .btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .out, .in {
          position: absolute;
          top: ${c.temp_top || "40px"};
          font-weight: bold;
          font-size: 1.1em;
        }

        .out { left: 15%; color: #ff6600; }
        .in { right: 15%; color: #3399ff; }

        .flame {
          position: absolute;
          top: 105px;
          font-size: 100px;
          color: ${flameState ? "#ff3300" : "#555"};
          text-shadow: ${flameState ? "0 0 20px rgba(255,80,0,0.7)" : "none"};
          animation: ${flameState ? "flamePulse 1.5s infinite ease-in-out" : "none"};
          transition: all 0.3s ease;
        }

        @keyframes flamePulse {
          0% { transform: scale(1) rotate(0deg); opacity: 0.85; }
          30% { transform: scale(1.07) rotate(-2deg); opacity: 1; }
          60% { transform: scale(0.95) rotate(2deg); opacity: 0.9; }
          100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
        }

        .pressure {
          position: absolute;
          top: 215px;
          font-size: 1.3em;
          font-weight: 500;
          color: ${pressure < 1 ? "#ff3333" : pressure > 2.5 ? "#ff9933" : "#444"};
        }

      </style>

      <div class="boiler-card">
        <div class="out">OUT: ${outTemp}°C</div>
        <div class="in">IN: ${inTemp}°C</div>

        <ha-icon class="flame" icon="mdi:fire"></ha-icon>
        <div class="pressure">${pressure} bar</div>

        <div class="panel">
          <div class="temp-block" style="align-items: flex-start;">
            <div class="btn" id="acm_up">+</div>
            <div class="value">${
              acm
                ? (acm.attributes.current_temperature ??
                   acm.attributes.temperature ??
                   acm.state)
                : "--"
            }°C</div>
            <div>ACM</div>
            <div class="btn" id="acm_down">−</div>
          </div>

          <div class="temp-block" style="align-items: flex-end;">
            <div class="btn" id="heat_up">+</div>
            <div class="value">${heat ? heat.state : "--"}°C</div>
            <div>Heat</div>
            <div class="btn" id="heat_down">−</div>
          </div>
        </div>
      </div>
    `;

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

    const current = Number(
      state.attributes.temperature ??
      state.attributes.current_temperature ??
      state.state
    );
    if (isNaN(current)) return;

    const newTemp = increase ? current + 1 : current - 1;

    if (entityId.startsWith("water_heater.")) {
      hass.callService("water_heater", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    } else if (entityId.startsWith("climate.")) {
      hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: newTemp,
      });
    } else if (entityId.startsWith("number.") || entityId.startsWith("input_number.")) {
      hass.callService("number", "set_value", {
        entity_id: entityId,
        value: newTemp,
      });
    }
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("boiler-card", BoilerCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "boiler-card",
  name: "Boiler Card",
  description: "Compact boiler control with bigger buttons and side-aligned temperatures.",
});
