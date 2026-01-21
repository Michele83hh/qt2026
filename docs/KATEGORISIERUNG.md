# CCNA Fragen-Kategorisierung

## Übersicht

Die 888 Fragen sind in 6 CCNA-Domains kategorisiert, basierend auf dem **offiziellen Cisco CCNA 200-301 v1.1 Exam Blueprint**.

| Domain | Präfix | Anzahl | Anteil | Cisco-Ziel |
|--------|--------|--------|--------|------------|
| Network Fundamentals | `nf-` | 495 | 55.7% | 20% |
| Network Access | `na-` | 187 | 21.1% | 20% |
| IP Connectivity | `ic-` | 47 | 5.3% | 25% |
| IP Services | `is-` | 85 | 9.6% | 10% |
| Security Fundamentals | `sf-` | 70 | 7.9% | 15% |
| Automation and Programmability | `ap-` | 4 | 0.5% | 10% |

**Hinweis:** Die aktuelle Verteilung weicht vom Ziel ab, da noch Module ausstehen (OSPF, ACLs, NAT, Automation). Nach Abschluss aller Netacad-Module wird die Verteilung ausgeglichener.

---

## Domain-Definitionen

### 1. Network Fundamentals (20%)
**Theorie und Grundlagen** - Was IST etwas und wie funktioniert es konzeptionell?

**Subtopics:**
- OSI & TCP/IP Models
- Ethernet & Cabling
- TCP & UDP
- ARP & ICMP
- Number Systems
- Network Architecture
- Application Protocols
- Network Segmentation
- IPv4 Addressing (Theorie)
- IPv6 Addressing (Theorie)

**Keywords:**
- OSI Model, TCP/IP Model, Layer 1-7
- Encapsulation, PDU
- Ethernet Standard, Cable Type, UTP, Fiber, RJ-45
- Straight-through, Crossover
- Three-way Handshake, SYN/ACK
- Connection-oriented, Connectionless
- Well-known Ports
- Binary, Decimal, Conversion
- ARP, ICMP, Ping
- Loopback, Private/Public Address, Class A-E

---

### 2. Network Access (20%)
**Layer 2 / LAN-Zugang** - Wie verbinden sich Geräte mit dem Netzwerk?

**Subtopics:**
- VLANs
- Trunking
- EtherChannel
- Spanning Tree Protocol
- Switch Operations
- Wireless LANs
- MAC Addresses & Encoding

**Keywords:**
- MAC Address Table, CAM Table
- Switch Learn, Flood, Forward Frame
- VLAN, Trunk, Native VLAN, 802.1Q
- EtherChannel, Port-Channel, LACP, PAgP
- Spanning Tree, STP, RSTP, PVST
- Root Bridge, BPDU
- WiFi, WLAN, Wireless, 802.11, SSID
- DHCP Client-Prozess: DORA (Discover, Offer, Request, Acknowledge)

---

### 3. IP Connectivity (25%)
**Layer 3 / Routing** - Wie erreichen Pakete ihr Ziel?

**Subtopics:**
- OSPF
- Routing Fundamentals
- Inter-VLAN Routing
- First Hop Redundancy
- DHCPv6 & SLAAC

**Keywords:**
- OSPF, Link-State, Area, Router-ID, DR/BDR
- Routing Table, `show ip route`
- Static Route, Default Route, `ip route`
- Next-Hop, Longest Prefix Match
- Administrative Distance, Metric
- Inter-VLAN, Router-on-a-Stick, Subinterface
- Encapsulation dot1Q
- HSRP, VRRP, GLBP, Standby IP
- SLAAC, Stateless Address, DHCPv6
- Router Advertisement, M-Flag, O-Flag
- Default Gateway
- Subnetting-Berechnungen: "How many hosts?", "Valid host range?", "Which subnet?"

---

### 4. IP Services (10%)
**Service-Konfiguration** - Wie konfiguriere ich Netzwerkdienste?

**Subtopics:**
- NAT/PAT
- DHCP (Server-Konfiguration)
- DNS
- Network Management (NTP, SNMP, Syslog)

**Keywords:**
- `ip dhcp pool`, `ip dhcp excluded`, `ip helper-address`, DHCP Relay
- `ip nat inside/outside`, `ip nat pool`, NAT Overload
- NAT, PAT, Network Address Translation
- Inside Global/Local, Outside Global/Local
- NTP, Network Time Protocol, `ntp server`
- SNMP, `snmp-server`
- Syslog, Logging
- IP SLA

---

### 5. Security Fundamentals (15%)
**Sicherheit** - Wie schütze ich das Netzwerk?

**Subtopics:**
- Access Control Lists
- Port Security
- Layer 2 Security
- AAA & Authentication
- Wireless Security
- VPN
- Firewalls
- Security Threats
- Device Security

**Keywords:**
- DHCP Snooping, Dynamic ARP Inspection (DAI)
- 802.1X, RADIUS, TACACS+, AAA
- ACL, Access-List, Access Control List
- Permit/Deny (mit IP-Adressen)
- Malware, Attack, Virus, Trojan, Worm, Phishing
- DDoS, Denial of Service, Man-in-the-Middle
- Spoofing, MAC Flooding, ARP Poisoning
- Firewall, VPN, IPsec
- Port Security, BPDU Guard, Root Guard
- Storm Control, VLAN Hopping
- Rogue (Access Point)
- Encryption, SSL, TLS
- Threat, Intrusion, Vulnerability

---

### 6. Automation and Programmability (10%)
**SDN & Automation** - Wie automatisiere ich Netzwerke?

**Subtopics:**
- SDN & Automation

**Keywords:**
- REST API, RESTful
- JSON
- SDN, Software-Defined
- Controller-Based
- Ansible, Puppet, Chef
- Python
- Network Automation, Network Programmability
- Cisco DNA Center
- NETCONF, RESTCONF, YANG

---

## Kategorisierungs-Regeln

### Regel 1: Security hat IMMER Vorrang
Wenn eine Frage Security-Keywords enthält, wird sie **immer** Security Fundamentals zugeordnet, auch wenn sie auch zu anderen Kategorien passen würde.

**Beispiel:** Eine Frage über "DHCP Snooping" → Security (nicht IP Services)

### Regel 2: Automation hat zweite Priorität
Automation-Fragen sind selten und wichtig für die Prüfung. Sie haben zweite Priorität nach Security.

### Regel 3: Balancierung bei Überschneidungen
Wenn eine Frage zu mehreren Kategorien passt (außer Security/Automation), wird sie der Kategorie mit **weniger Fragen** zugeordnet, um die Verteilung auszugleichen.

**Beispiel:** Eine Frage passt zu Network Fundamentals UND IP Connectivity → IP Connectivity (weil weniger Fragen)

### Regel 4: Nur Frage + korrekte Antworten zählen
Die Kategorisierung basiert **nur** auf:
- Dem Fragetext
- Den **korrekten** Antwortoptionen

Die Erklärung (Explanation) und falsche Antworten werden **nicht** berücksichtigt, da sie irreführende Keywords enthalten können.

---

## ID-Format

Jede Frage hat eine eindeutige ID im Format: `{präfix}-{nummer}`

- **Präfix:** 2 Buchstaben für die Domain (nf, na, ic, is, sf, ap)
- **Nummer:** 4-stellig, führende Nullen (0001, 0002, ...)

**Beispiele:**
- `nf-0001` = Network Fundamentals, Frage 1
- `sf-0109` = Security Fundamentals, Frage 109
- `ap-0004` = Automation, Frage 4

Die IDs sind **lückenlos** durchnummeriert innerhalb jeder Kategorie.

---

## Inhaltslücken

Die aktuelle Verteilung weicht von den Cisco-Zielen ab:

| Domain | Aktuell | Ziel | Differenz |
|--------|---------|------|-----------|
| Network Fundamentals | 40.1% | 20% | +20.1% (zu viele) |
| Network Access | 24.0% | 20% | +4.0% |
| IP Connectivity | 14.8% | 25% | **-10.2%** (zu wenige) |
| IP Services | 8.4% | 10% | -1.6% |
| Security Fundamentals | 12.3% | 15% | -2.7% |
| Automation | 0.5% | 10% | **-9.5%** (zu wenige) |

**Handlungsbedarf:**
1. Mehr **IP Connectivity** Fragen hinzufügen (Routing, OSPF, Subnetting)
2. Mehr **Automation** Fragen hinzufügen (SDN, REST API, JSON, Python)
3. Optional: Einige Network Fundamentals Fragen entfernen oder neu kategorisieren

---

## Technische Implementierung

Das Kategorisierungs-Skript befindet sich in:
```
scripts/categorize-v2.cjs
scripts/apply-categorization.cjs
```

**Ablauf:**
1. Lade alle Fragen aus `src/data/questions.json`
2. Prüfe jede Frage gegen die Keyword-Patterns
3. Wende Prioritätsregeln an (Security > Automation > Balancierung)
4. Vergebe neue IDs (lückenlos)
5. Speichere zurück in `questions.json`

---

*Letzte Aktualisierung: 2026-01-21*
