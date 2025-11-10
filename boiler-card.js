class BoilerCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities) throw new Error("You need to define entities");
    this.config = config;
  }

  set hass(hass) {
    const config = this.config;

    if (!this.card) {
      this.card = document.createElement("ha-card");
      this.card.style.padding = "8px";
      this.card.style.display = "flex";
      this.card.style.flexDirection = "column";
      this.card.style.alignItems = "center";
      this.card.style.justifyContent = "center";
      this.card.style.background =
        "linear-gradient(to bottom, #f6f6f6 65%, #2a2a2a 65%)";
      this.card.style.borderRadius = "16px";
      this.card.style.overflow = "hidden";
      this.card.style.maxWidth = "260px";   // mai îngust
      this.card.style.margin = "0 auto";

      const wrapper = document.createElement("div");
      wrapper.style.textAlign = "center";
      wrapper.style.width = "100%";
      wrapper.style.position = "relative";

      // OUT / IN
      this.outTemp = document.createElement("div");
      this.inTemp = document.createElement("div");
      this.outTemp.style.position = this.inTemp.style.position = "absolute";
      this.outTemp.style.left = "8px";
      this.inTemp.style.right = "8px";
      this.outTemp.style.top = this.inTemp.style.top = "6px";
      this.outTemp.style.color = "orange";
      this.inTemp.style.color = "dodgerblue";
      this.outTemp.style.fontWeight = this.inTemp.style.fontWeight = "bold";
      this.outTemp.style.fontSize = this.inTemp.style.fontSize = "14px";

      // flacără + presiune
      this.flame = document.createElement("div");
      this.flame.innerHTML = "🔥";
      this.flame.style.fontSize = "70px";     // mai mică
      this.flame.style.marginTop = "40px";

      this.pressure = document.createElement("div");
      this.pressure.style.fontSize = "14px";
      this.pressure.style.marginTop = "4px";
      this.pressure.style.color = "#444";

      // zona de control
      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.width = "100%";
      controls.style.padding = "12px 8px 4px 8px";

      const createBlock = (label) => {
        const block = document.createElement("div");
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.alignItems = "center";
        block.style.gap = "6px";
        block.style.width = "48%";

        const plus = document.createElement("button");
        plus.innerText = "+";
        const minus = document.createElement("button");
        minus.innerText = "−";

        [plus, minus].forEach((btn) => {
          btn.style.width = "48px";
          btn.style.height = "48px";
          btn.style.fontSize = "26px";
          btn.style.borderRadius = "10px";
          btn.style.border = "1px solid #555";
          btn.style.background = "#333";
          btn.style.color = "#fff";
          btn.style.cursor = "pointer";
          btn.style.transition = "0.2s";
          btn.onmouseenter = () => (btn.style.background = "#444");
          btn.onmouseleave = () => (btn.style.background = "#333");
        });

        const display = document.createElement("div");
        display.style.fontFamily = "'Courier New', monospace";
        display.style.fontSize = "26px";
        display.style.color = "#00ff66";
        display.style.background = "#000";
        display.style.padding = "4px 12px";
        display.style.borderRadius = "6px";
        display.style.boxShadow = "0 0 6px #00ff66 inset";

        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        labelEl.style.color = "#fff";
        labelEl.style.fontWeight = "500";
        labelEl.style.fontSize = "13px";

        block.appendChild(plus);
        block.appendChild(display);
        block.appendChild(labelEl);
        block.appendChild(minus);

        block.plus = plus;
        block.minus = minus;
        block.display = display;
        return block;
      };

      this.acmBlock = createBlock("ACM");
      this.heatBlock = createBlock("Heat");

      controls.appendChild(this.acmBlock);
      controls.appendChild(this.heatBlock);

      wrapper.appendChild(this.outTemp);
      wrapper.appendChild(this.inTemp);
      wrapper.appendChild(this.flame);
      wrapper.appendChild(this.pressure);
      wrapper.appendChild(controls);
      this.card.appendChild(wrapper);
      this.appendChild(this.card);
    }

    // --- actualizare din HA ---
    const getState = (id) => hass.states[id]?.state ?? "–";
    const acm = hass.states[config.entities.acm_temp];
    const heat = hass.states[config.entities.heat_temp];

    this.outTemp.innerText = `OUT: ${getState(config.entities.out)}°C`;
    this.inTemp.innerText = `IN: ${getState(config.entities.in)}°C`;
    this.pressure.innerText = `${getState(config.entities.pressure)} bar`;

    const flameOn = hass.states[config.entities.flame]?.state === "on";
    this.flame.style.opacity = flameOn ? "1" : "0.25";
    this.flame.style.filter = flameOn ? "drop-shadow(0 0 12px red)" : "none";

    // ACM: afișăm ce primim, că poate are decimale
    const acmVal =
      acm?.attributes?.current_temperature ??
      acm?.attributes?.temperature ??
      acm?.state ??
      "--";
    this.acmBlock.display.innerText = acmVal;

    // HEAT: fără .0 dacă e întreg
    const heatRaw = getState(config.entities.heat_temp);
    const heatNum = Number(heatRaw);
    let heatDisplay;
    if (isNaN(heatNum)) {
      heatDisplay = heatRaw;
    } else {
      heatDisplay = Number.isInteger(heatNum)
        ? heatNum.toString()
        : heatNum.toFixed(1);
    }
    this.heatBlock.display.innerText = heatDisplay;

    // --- servicii ---
    const callService = (domain, service, data) => {
      hass.callService(domain, service, data);
    };

    // ACM water_heater.set_temperature
    this.acmBlock.plus.onclick = () => {
      const current = Number(acm?.attributes?.temperature ?? acm?.state);
      if (isNaN(current)) return;
      callService("water_heater", "set_temperature", {
        entity_id: config.entities.acm_temp,
        temperature: current + 1,
      });
    };

    this.acmBlock.minus.onclick = () => {
      const current = Number(acm?.attributes?.temperature ?? acm?.state);
      if (isNaN(current)) return;
      callService("water_heater", "set_temperature", {
        entity_id: config.entities.acm_temp,
        temperature: current - 1,
      });
    };

    // HEAT number.set_value, nu increment/decrement
    this.heatBlock.plus.onclick = () => {
      const current = Number(heat?.state);
      if (isNaN(current)) return;
      callService("number", "set_value", {
        entity_id: config.entities.heat_temp,
        value: current + 1,
      });
    };

    this.heatBlock.minus.onclick = () => {
      const current = Number(heat?.state);
      if (isNaN(current)) return;
      callService("number", "set_value", {
        entity_id: config.entities.heat_temp,
        value: current - 1,
      });
    };
  }

  getCardSize() {
    return 3;
  }
}

// GUI editor
class BoilerCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.render();
  }

  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const c = this.config;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <style>
        .editor {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        label { font-weight: bold; color: #fff; font-size: 13px; }
        input {
          width: 100%;
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
        }
        :host {
          display: block;
          background: #111;
          padding: 10px;
          border-radius: 8px;
        }
      </style>
      <div class="editor">
        <label>Flame entity</label>
        <input id="flame" value="${c.entities?.flame ?? ""}" />
        <label>Out temp</label>
        <input id="out" value="${c.entities?.out ?? ""}" />
        <label>In temp</label>
        <input id="in" value="${c.entities?.in ?? ""}" />
        <label>Pressure</label>
        <input id="pressure" value="${c.entities?.pressure ?? ""}" />
        <label>ACM (water_heater)</label>
        <input id="acm_temp" value="${c.entities?.acm_temp ?? ""}" />
        <label>Heating temp (number)</label>
        <input id="heat_temp" value="${c.entities?.heat_temp ?? ""}" />
      </div>
    `;
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(wrapper);
    this.shadowRoot.querySelectorAll("input").forEach((input) =>
      input.addEventListener("change", (e) => this._valueChanged(e))
    );
  }

  _valueChanged(ev) {
    const newConfig = JSON.parse(JSON.stringify(this.config));
    newConfig.entities = newConfig.entities || {};
    newConfig.entities[ev.target.id] = ev.target.value;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: newConfig } })
    );
  }
}

customElements.define("boiler-card", BoilerCard);
customElements.define("boiler-card-editor", BoilerCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "boiler-card",
  name: "Boiler Card",
  description: "Smart boiler controller card with GUI configuration.",
});

BoilerCard.getConfigElement = () =>
  document.createElement("boiler-card-editor");

BoilerCard.getStubConfig = () => ({
  entities: {
    flame: "binary_sensor.example_flame",
    out: "sensor.example_out",
    in: "sensor.example_in",
    pressure: "sensor.example_pressure",
    acm_temp: "water_heater.example_acm",
    heat_temp: "number.example_heat",
  },
});
