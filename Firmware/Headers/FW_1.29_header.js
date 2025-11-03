var g = Object.create(Graphics["prototype"]);
var VERSION = "1.29";
E.on("init", function () {
    if (typeof Pip !== "undefined" && typeof Pip.remove === "function") {
        Pip.remove();
    }
    require("fs")
        .readdir("USER_BOOT")
        .sort()
        .forEach(function (f) {
            if (f.endsWith(".js")) {
                eval(require("fs").readFile("USER_BOOT/" + f));
            }
        });
});
E.showMenu = function (g) {
    function i(a) {
        a ? c.move(-a) : c.select();
    }
    var b = bC;
    b.clear(1);
    var a = g[""],
        d = Object.keys(g);
    a && (d.splice(d.indexOf(""), 1), a.back && ((g["< Back"] = a.back), d.unshift("< Back"))),
        a instanceof Object || (a = {}),
        a.selected === undefined && (a.selected = 0),
        (a.rowHeight = 27);
    var h = 10,
        f = a.x2 || b.getWidth() - 20,
        e = 12,
        j = b.getHeight() - 1;
    a.title && (e += a.rowHeight + 2);
    var c = {
        draw: function () {
            b.reset().setFontMonofonto18(),
                a.predraw && a.predraw(b),
                b.setFontAlign(0, -1),
                a.title && (b.drawString(a.title, (h + f) / 2, e - a.rowHeight), b.drawLine(h, e - 2, f, e - 2));
            var o = 0 | Math.min((j - e) / a.rowHeight, d.length),
                k = E.clip(a.selected - (o >> 1), 0, d.length - o),
                i = e,
                s = k > 0;
            b.setColor(k > 0 ? 3 : 0).fillPoly([190, 10, 210, 10, 200, 0]);
            while (o--) {
                var q = d[k],
                    l = g[q],
                    r = k == a.selected && !c.selectEdit;
                if (
                    (b.setBgColor(r ? 3 : 0).clearRect(h, i, f, i + a.rowHeight - 1),
                    b
                        .setColor(r ? 0 : 3)
                        .setFontAlign(-1, -1)
                        .drawString(q, h + 20, i + 4),
                    "o" == (typeof l)[0])
                ) {
                    var m = f,
                        n = l.value;
                    if ((l.format && (n = l.format(n)), c.selectEdit && k == a.selected)) {
                        var p = a.rowHeight > 10 ? 2 : 1;
                        (m -= 12 * p + 1),
                            b.setBgColor(3).clearRect(m - (b.stringWidth(n) + 4), i, f, i + a.rowHeight - 1),
                            b
                                .setColor(0)
                                .drawImage(
                                    { width: 12, height: 5, buffer: " \7\0\xF9\xF0\x0E\0@", transparent: 0 },
                                    m,
                                    i + (a.rowHeight - 5 * p) / 2,
                                    { scale: p }
                                );
                    }
                    b.setFontAlign(1, -1).drawString(n.toString(), m - 2, i + 4);
                }
                (i += a.rowHeight), k++;
            }
            b.setColor(k < d.length ? 3 : 0).fillPoly([191, 201, 210, 201, 200, 210]),
                b.setColor(3).setBgColor(0).setFontAlign(-1, -1).flip();
        },
        select: function () {
            var b = g[d[a.selected]];
            Pip.audioStartVar(Pip.audioBuiltin("OK")),
                "f" == (typeof b)[0]
                    ? b(c)
                    : "o" == (typeof b)[0] &&
                      ("n" == (typeof b.value)[0]
                          ? (c.selectEdit = c.selectEdit ? undefined : b)
                          : ("b" == (typeof b.value)[0] && (b.value = !b.value), b.onchange && b.onchange(b.value)),
                      c.draw());
        },
        move: function (e) {
            if (c.selectEdit) {
                var b = c.selectEdit;
                let a = b.value;
                (b.value -= (e || 1) * (b.step || 1)),
                    b.min !== undefined && b.value < b.min && (b.value = b.wrap ? b.max : b.min),
                    b.max !== undefined && b.value > b.max && (b.value = b.wrap ? b.min : b.max),
                    b.onchange && b.value != a && b.onchange(b.value, -e);
            } else {
                let b = a.selected;
                a.wrapSelection
                    ? (a.selected = (e + a.selected + d.length) % d.length)
                    : (a.selected = E.clip(a.selected + e, 0, d.length - 1)),
                    b != a.selected && !Pip.radioKPSS && Pip.knob1Click(e);
            }
            c.draw();
        },
    };
    return (
        Pip.removeSubmenu && Pip.removeSubmenu(),
        c.draw(),
        Pip.on("knob1", i),
        (Pip.removeSubmenu = () => {
            Pip.removeListener("knob1", i);
        }),
        c
    );
};
E.showPrompt = function (e, a) {
    function c() {
        g.setColor(a.color);
        var f = g.getWidth(),
            n = g.getHeight(),
            k = a.title;
        k &&
            g
                .setFontMonofonto23()
                .setFontAlign(0, -1, 0)
                .setBgColor(a.color)
                .drawString(k, f / 2, 42)
                .setBgColor(0),
            g.setFontMonofonto18().setFontAlign(0, 0, 0);
        var i = e.split("\n"),
            l = 125 - (i.length * 20) / 2;
        a.clearBg &&
            g.clearRect((f - i[0].length * 8) / 2 - 20, l - 20, (f + i[0].length * 8) / 2 + 20, 175 + b.length * 20),
            i.forEach((a, b) => g.drawString(a, f / 2, l + b * 20));
        var h, c, j, m;
        (h = f / 2),
            (c = 175 - (b.length - 1) * 20),
            b.forEach((b, e) => {
                (b = b),
                    (j = 50),
                    (m = [h - j - 4, c - 13, h + j + 4, c - 13, h + j + 4, c + 13, h - j - 4, c + 13]),
                    g
                        .setColor(e == a.selected ? d : 0)
                        .fillPoly(m)
                        .setColor(a.color)
                        .drawPoly(m, 1)
                        .setFontMonofonto18()
                        .drawString(b, h, c + 1),
                    (c += 36);
            }),
            g.setFontAlign(-1, -1);
    }
    var d = g.blendColor(g.theme.bg, g.theme.fg, 0.5);
    a || (a = {}), a.buttons || (a.buttons = { Yes: !0, No: !1 });
    var b = Object.keys(a.buttons);
    return (
        a.selected || (a.selected = 0),
        a.color === undefined && (a.color = g.theme.fg),
        a.clearBg || (a.clearBg = !0),
        c(),
        new Promise((f) => {
            let d = !0;
            function e(g) {
                g
                    ? d
                        ? ((a.selected -= g),
                          a.selected < 0 && (a.selected = 0),
                          a.selected >= b.length && (a.selected = b.length - 1),
                          c(),
                          (d = !1))
                        : (d = !0)
                    : (Pip.removeListener("knob1", e), f(a.buttons[b[a.selected]]));
            }
            Pip.on("knob1", e),
                (Pip.removeSubmenu = () => {
                    Pip.removeListener("knob1", e);
                });
        })
    );
};
E.showMessage = function (a) {
    g.clear(1),
        bC.clear(1).setColor(3).setFontMonofonto23().setFontAlign(0, 0),
        drawVaultTecLogo(200, 48 - 12 * a.split("\n").length, bC),
        bC.drawString(a, 200, 156).flip();
};
