class BoilerCard extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("Config required");
    this.config = config;

    const card = document.createElement("ha-card");
    card.style.position = "relative";
    card.style.overflow = "hidden";
    card.style.backgroundImage = `url(${config.image || "/local/boiler-card/boiler_base.png"})`;
    card.style.backgroundSize = "contain";
    card.style.backgroundRepeat = "no-repeat";
    card.style.backgroundPosition = "center";
    card.style.height = config.height || "420px";

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;

    overlay.innerHTML = `
      <style>
        .flame {
          position: absolute;
          top: ${config.flame_top || "110px"};
          left: ${config.flame_left || "50%"};
          transform: translateX(-50%);
          font-size: ${config.flame_size || "64px"};
          color: var(--disabled-text-color);
          transition: color 0.3s ease;
        }
        .temp-out, .temp-in {
          position: absolute;
          top: ${config.temp_top || "60px"};
          font-weight: bold;
          font-size: ${config.temp_font || "18px"};
        }
        .temp-out {
          left: ${config.temp_out_left || "20%"};
          color: #ff6600;
        }
        .temp-in {
          right: ${config.temp_in_right || "20%"};
          color: #0080ff;
        }
        .pressure {
          position: absolute;
          top: ${config.pressure_top || "190px"};
          left: 50%;
          transform: translateX(-50%);
          font-size: 20px;
          color: #333;
        }
        .display {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 40px;
        }
        .zone {
          text-align: center;
          color: white;
          font-size: 16px;
        }
        .btn {
          display: inline-block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
        }
      </style>

      <div class="temp-out" id="out">OUT: --°C</div>
      <div class="temp-in" id="in">IN: --°C</div>
      <ha-icon icon="mdi:fire" class="flame" id="flame"></ha-icon>
      <div class="pressure" id="pressure">-- bar</div>
      <div class="display">
        <div class="zone">
          <div class="btn" id="acm-plus">+</div>
          <div id="acm-val">--°C</div>
          <div>ACM</div>
          <div class="btn" id="acm-minus">–</div>
        </div>
        <div class="zone">
          <div class="btn" id="heat-plus">+</div>
          <div id="heat-val">--°C</div>
          <div>Heat</div>
          <div class="btn" id="heat-minus">–</div>
        </div>
      </div>
    `;

    card.appendChild(overlay);
    this.appendChild(card);
  }

  set hass(hass) {
    const cfg = this.config;
    const flameEl = this.querySelector("#flame");
    const outEl = this.querySelector("#out");
    const inEl = this.querySelector("#in");
    const pEl = this.querySelector("#pressure");
    const acmVal = this.querySelector("#acm-val");
    const heatVal = this.querySelector("#heat-val");

    const getState = id => (id && hass.states[id]) ? hass.states[id].state : "--";

    const flameState = getState(cfg.entities.flame);
    const outTemp = getState(cfg.entities.out);
    const inTemp = getState(cfg.entities.in);
    const press = getState(cfg.entities.pressure);
    const acm = getState(cfg.entities.acm_temp);
    const heat = getState(cfg.entities.heat_temp);

    flameEl.style.color = (flameState === "on") ? "#ff3b00" : "rgba(0,0,0,0.2)";
    outEl.textContent = `OUT: ${outTemp}°C`;
    inEl.textContent = `IN: ${inTemp}°C`;
    pEl.textContent = `${press} bar`;
    acmVal.textContent = `${acm}°C`;
    heatVal.textContent = `${heat}°C`;

    // Buttons
    const send = (service, entity) => {
      const [domain, name] = service.split(".");
      hass.callService(domain, name, { entity_id: entity });
    };

    this.querySelector("#acm-plus").onclick = () => send(cfg.services.acm_up, cfg.entities.acm_temp);
    this.querySelector("#acm-minus").onclick = () => send(cfg.services.acm_down, cfg.entities.acm_temp);
    this.querySelector("#heat-plus").onclick = () => send(cfg.services.heat_up, cfg.entities.heat_temp);
    this.querySelector("#heat-minus").onclick = () => send(cfg.services.heat_down, cfg.entities.heat_temp);
  }

  getCardSize() { return 4; }
}

customElements.define("boiler-card", BoilerCard);
