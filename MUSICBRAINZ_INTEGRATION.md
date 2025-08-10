# MusicBrainz Integration für manuelle Metadatenverbesserung

Diese Integration verwendet die MusicBrainz-API, um auf Knopfdruck fehlende oder falsche Künstler- und Albumdaten zu korrigieren.

## Features

### 1. **Manueller Enhancement-Button**
- Button "X Tracks verbessern" in LikedSongs und MyUploads Seiten
- Erscheint nur, wenn Tracks mit unbekannten Künstlern vorhanden sind
- Verarbeitet alle betroffenen Tracks in einem Batch-Prozess

### 2. **Browser-Tab-Titel mit Songname**
- Der Browser-Tab zeigt den Songtitel und Künstler an, wenn ein Lied spielt
- Format: "♪ Songname - Künstler | Melodify Music"
- Kehrt zu "Melodify Music" zurück bei Pause/Stop

### 3. **Intelligente Batch-Verarbeitung**
- Verarbeitet Tracks in 3er-Gruppen zur API-Schonung
- 1-Sekunden-Pause zwischen Batches
- Fortschrittsanzeige und Erfolgsbenachrichtigung
- Qualitätsfilter: Nur Treffer mit Score > 70 werden verwendet

## Wie es funktioniert

### Trigger für Enhancement
Tracks werden nur verbessert, wenn:
- Der Künstler "Unknown Artist" oder "Unbekannt" ist
- Das Künstlerfeld leer oder nur Leerzeichen enthält
- Der Benutzer den Enhancement-Button drückt

### MusicBrainz-Suche
1. **Titel-basierte Suche**: Sucht nach Recordings mit dem Track-Titel
2. **Qualitätskontrolle**: Nur Ergebnisse mit Score ≥ 70 werden akzeptiert
3. **Metadaten-Extraktion**: Künstler, Album und Jahr werden extrahiert
4. **Fehlerbehandlung**: Graceful Fallback bei API-Fehlern

### Benutzeroberfläche
- **Enhancement-Button**: Erscheint nur bei betroffenen Tracks
- **Ladezustand**: Spinner-Animation während der Verarbeitung
- **Erfolgsbenachrichtigung**: Zeigt Anzahl der verbesserten Tracks
- **Automatische Aktualisierung**: UI wird nach Enhancement aktualisiert

## Technische Details

### API Rate Limiting
- Batch-Größe: 3 Tracks pro Anfrage
- Pause zwischen Batches: 1 Sekunde
- Timeout pro Anfrage: Standard MusicBrainz-Limits

### Datenqualität
- Minimum Score: 70/100 für akzeptierte Treffer
- Fallback zu ursprünglichen Daten bei schlechten Treffern
- Console-Logging für Debugging

### Performance
- Keine automatischen Hintergrund-Prozesse
- Nur manuell ausgelöste Verbesserungen
- Keine Interferenz mit Musik-Wiedergabe
- Minimaler Speicherverbrauch

## Verwendung

1. **In MyUploads oder LikedSongs navigieren**
2. **"X Tracks verbessern" Button klicken** (falls sichtbar)
3. **Auf Abschluss warten** (Toast-Benachrichtigung)
4. **Verbesserte Metadaten sind sofort sichtbar**

Das System ist respektvoll gegenüber der kostenlosen MusicBrainz-API und stört nicht die normale Nutzung der App.
