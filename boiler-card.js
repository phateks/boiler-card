class BoilerCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities) {
      throw new Error("You need to define entities");
    }
    this.config = config;
  }

  set hass(hass) {
    const config = this.config;
    if (!this.card) {
      this.card = document.createElement("ha-card");
      this.card.style.padding = "16px";
      this.card.style.display = "flex";
      this.card.style.flexDirection = "column";
      this.card.style.alignItems = "center";
      this.card.style.justifyContent = "center";
      this.card.style.background = "linear-gradient(to bottom, #f6f6f6 70%, #2a2a2a 70%)";
      this.card.style.borderRadius = "16px";
      this.card.style.overflow = "hidden";

      // --- Wrapper principal
      const wrapper = document.createElement("div");
      wrapper.style.textAlign = "center";
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "320px";
      wrapper.style.position = "relative";

      // --- OUT / IN temps
      this.outTemp = document.createElement("div");
      this.inTemp = document.createElement("div");
      this.outTemp.style.position = this.inTemp.style.position = "absolute";
      this.outTemp.style.left = "10px";
      this.outTemp.style.top = "10px";
      this.inTemp.style.right = "10px";
      this.inTemp.style.top = "10px";
      this.outTemp.style.color = "orange";
      this.inTemp.style.color = "dodgerblue";
      this.outTemp.style.fontWeight = this.inTemp.style.fontWeight = "bold";
      this.outTemp.style.fontSize = this.inTemp.style.fontSize = "18px";

      // --- Flame + pressure
      this.flame = document.createElement("div");
      this.flame.innerHTML = "🔥";
      this.flame.style.fontSize = "100px";
      this.flame.style.marginTop = "60px";
      this.pressure = document.createElement("div");
      this.pressure.style.fontSize = "18px";
      this.pressure.style.marginTop = "10px";
      this.pressure.style.color = "#444";

      // --- Bottom control section
      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.width = "100%";
      controls.style.padding = "20px 10px 10px 10px";

      const createBlock = (label) => {
        const block = document.createElement("div");
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.alignItems = "center";
        block.style.gap = "8px";
        block.style.width = "45%";

        const plus = document.createElement("button");
        plus.innerText = "+";
        const minus = document.createElement("button");
        minus.innerText = "-";
        [plus, minus].forEach(btn => {
          btn.style.width = "50px";
          btn.style.height = "50px";
          btn.style.fontSize = "28px";
          btn.style.borderRadius = "10px";
          btn.style.border = "1px solid #555";
          btn.style.background = "#333";
          btn.style.color = "#fff";
          btn.style.cursor = "pointer";
        });

        const display = document.createElement("div");
        display.style.fontFamily = "'Courier New', monospace";
        display.style.fontSize = "32px";
        display.style.color = "#00ff66";
        display.style.background = "#000";
        display.style.padding = "5px 15px";
        display.style.borderRadius = "8px";
        display.style.boxShadow = "0 0 8px #00ff66 inset";

        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        labelEl.style.color = "#fff";
        labelEl.style.fontWeight = "500";

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

      // --- Final assembly
      wrapper.appendChild(this.outTemp);
      wrapper.appendChild(this.inTemp);
      wrapper.appendChild(this.flame);
      wrapper.appendChild(this.pressure);
      wrapper.appendChild(controls);
      this.card.appendChild(wrapper);
      this.appendChild(this.card);
    }

    // === actualizare date din entități ===
    const getState = (id) => hass.states[id]?.state ?? "–";
    const acm = hass.states[config.entities.acm_temp];
    const heat = hass.states[config.entities.heat_temp];

    this.outTemp.innerText = `OUT: ${getState(config.entities.out)}°C`;
    this.inTemp.innerText = `IN: ${getState(config.entities.in)}°C`;
    this.pressure.innerText = `${getState(config.entities.pressure)} bar`;

    const flameOn = hass.states[config.entities.flame]?.state === "on";
    this.flame.style.opacity = flameOn ? "1" : "0.2";
    this.flame.style.filter = flameOn ? "drop-shadow(0 0 20px red)" : "none";

    // valori afișaj digital
    this.acmBlock.display.innerText =
      acm?.attributes?.current_temperature ?? acm?.attributes?.temperature ?? acm?.state ?? "--";
    this.heatBlock.display.innerText = getState(config.entities.heat_temp);

    // === controale butoane ===
    const callService = (domain, service, entity_id, value) => {
      hass.callService(domain, service, { entity_id, value });
    };

    // ACM
    this.acmBlock.plus.onclick = () => callService("water_heater", "set_temperature", config.entities.acm_temp, parseFloat(acm.attributes.temperature) + 1);
    this.acmBlock.minus.onclick = () => callService("water_heater", "set_temperature", config.entities.acm_temp, parseFloat(acm.attributes.temperature) - 1);

    // HEAT
    this.heatBlock.plus.onclick = () => callService("number", "increment", config.entities.heat_temp);
    this.heatBlock.minus.onclick = () => callService("number", "decrement", config.entities.heat_temp);
  }

  getCardSize() {
    return 5;
  }
}

customElements.define("boiler-card", BoilerCard);


// === GUI EDITOR ===
class BoilerCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.render();
  }

  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <style>
        .editor {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        label { font-weight: bold; }
        select, input {
          width: 100%;
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
        }
      </style>
      <div class="editor">
        <label>Flame entity</label>
        <input id="flame" value="${this.config.entities?.flame ?? ""}" />
        <label>Out temp</label>
        <input id="out" value="${this.config.entities?.out ?? ""}" />
        <label>In temp</label>
        <input id="in" value="${this.config.entities?.in ?? ""}" />
        <label>Pressure</label>
        <input id="pressure" value="${this.config.entities?.pressure ?? ""}" />
        <label>ACM (water_heater)</label>
        <input id="acm_temp" value="${this.config.entities?.acm_temp ?? ""}" />
        <label>Heating temp</label>
        <input id="heat_temp" value="${this.config.entities?.heat_temp ?? ""}" />
      </div>
    `;
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(wrapper);
    this.shadowRoot.querySelectorAll("input").forEach(input => {
      input.addEventListener("change", (e) => this._valueChanged(e));
    });
  }

  _valueChanged(ev) {
    const newConfig = JSON.parse(JSON.stringify(this.config));
    newConfig.entities = newConfig.entities || {};
    newConfig.entities[ev.target.id] = ev.target.value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig } }));
  }
}

customElements.define("boiler-card-editor", BoilerCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "boiler-card",
  name: "Boiler Card",
  description: "Smart boiler controller card with GUI configuration."
});
