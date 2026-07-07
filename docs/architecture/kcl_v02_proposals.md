[kcl_v02_proposals.md](https://github.com/user-attachments/files/29735924/kcl_v02_proposals.md)
# KCL v0.2 – Verbesserungsvorschläge
**Aus der Produktion von Episode 02 abgeleitet**

---

## VB-01: Blocktyp `phone_dialogue`

**Problem:** Szene B (Telefonat) verwendet zwei physische Orte (Kleve + Nijmegen)
in einer Szene. Der aktuelle Typ `dialogue` hat keinen Mechanismus für
den Telefon-Kontext (kein Gesicht, andere Akustik).

**Vorschlag:**
```json
{
  "type": "phone_dialogue",
  "phone_role": "caller" | "receiver",
  "nl_text": "...",
  "ww_text": "...",
  "de_text": "...",
  "has_reveal_button": true | false
}
```

**Renderer-Verhalten:** Visuell anders als reguläres Dialogue-Card
(Grauer Hintergrund, Phone-Badge, leicht kleinere Schrift für Distanz).

---

## VB-02: Blocktyp `screen_text`

**Problem:** Szene A (Werkstatt) zeigt einen E-Mail-Entwurf auf dem
Bildschirm. `narrator_text` behandelt diesen als Erzählertext, was
visuell nicht korrekt ist.

**Vorschlag:**
```json
{
  "type": "screen_text",
  "device": "phone" | "computer" | "tablet",
  "nl_text": "...",
  "de_text": "...",
  "has_reveal_button": false
}
```

---

## VB-03: Regel für `ze` / Genusverweise in WW-Ebene

**Problem:** Block D.3: `Hier komt ze.` — `ze` ist Femininum für `de plank`.
Die WW-Übersetzung `Hier kommt sie.` ist für Deutsche ohne Kontext verwirrend.

**Vorschlag:** Optionales Feld `ww_annotation`:
```json
{
  "ww_text": "Das ist die Mauer. Hier kommt sie.",
  "ww_annotation": "ze = de plank (femininum)"
}
```

Renderer zeigt Annotation als kleinen Hinweis unterhalb der WW-Zeile.

---

## VB-04: Feld `marta_name_canon` / Figuren-Status-Flag

**Problem:** Marta's Name ist unbestätigt (vorläufig). Der JSON hat keine
Möglichkeit, diesen Status zu kennzeichnen. Wenn `hidden_canon.md` den
Namen bestätigt, müsste das JSON nachgepflegt werden.

**Vorschlag:** `characters[]`-Array auf Episode-Level:
```json
"characters": [
  {"char_id": "CHAR-05", "name": "Marta", "name_confirmed": false}
]
```

---

## VB-05: `scene.location_id` Referenz

**Problem:** Szenen haben keinen Verweis auf die Location Registry.
Szene B hat zwei Orte; das Schema kann das nicht ausdrücken.

**Vorschlag:**
```json
{
  "scene_id": "ep_02_scene_b",
  "location_ids": ["LOC-08", "LOC-09"],
  "primary_location": "LOC-08"
}
```

---

*KCL v0.2 Vorschläge · Aus Ep02-Produktion*
