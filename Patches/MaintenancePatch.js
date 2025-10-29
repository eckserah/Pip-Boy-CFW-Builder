window.Patches.MaintenancePatch = {
    
    // 'insert' objects are injected at insertion markers
    insert: {
        RAMScan: `
const RAMScanEnabled == false;
const ramScanTimeout;
function drawRamOverlay() {
  if (RAMScanEnabled == false) {
    return;
  }

  const mem = process.memory();
  const used = mem.usage;
  const total = mem.total;
  const text = used + '/' + total;

  const COLOR_THEME = g.theme.fg;
  const COLOR_BLACK = '#000000';
  const HEIGHT = g.getHeight();
  const WIDTH = g.getWidth();

  const area = {
    x1: WIDTH - 95,
    y1: HEIGHT - 40,
    x2: WIDTH - 55,
    y2: HEIGHT - 30,
  };

  // g.setColor(COLOR_THEME);
  // g.drawRect(area);

  g.setColor(COLOR_BLACK);
  g.fillRect(area);

  g.setColor(COLOR_THEME);
  g.setFont('4x6');
  g.setFontAlign(1, 1, 0);
  g.drawString(text, area.x2, area.y1 + 8);
}

function clearRamScanTimeout() {
  if (ramScanTimeout) {
    clearTimeout(ramScanTimeout);
  }
}

function ramScanLoop() {
  if (RAMScanEnabled == false) {
    clearRamScanTimeout();
    return;
  }

  drawRamOverlay();
  ramScanTimeout = setTimeout(ramScanLoop, 1000);
}

clearRamScanTimeout();
setTimeout(() => {
  ramScanLoop();
}, 3000);
		`,
		RAMScanToggle: `
		"RAM Scan": function()
		{
			RAMScanEnabled != RAMScanEnabled;
		},
		`
	},

    // 'replace' objects replace entire blocks
    replace: {
        // This patch doesn't replace any regions, so this is empty.
    }
};