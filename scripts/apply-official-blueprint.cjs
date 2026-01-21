/**
 * Wendet offizielle Blueprint-Kategorisierung an und speichert
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/questions.json');
const data = require(dataPath);
const questions = data.questions;

function getRelevantText(q) {
  let text = q.question;
  if (q.options && q.correctAnswer) {
    q.correctAnswer.forEach(idx => {
      if (q.options[idx]) text += ' ' + q.options[idx];
    });
  }
  return text.toLowerCase();
}

function categorizeByBlueprint(q) {
  const text = getRelevantText(q);

  // 6.0 AUTOMATION
  if (
    /\bsdn\b|software.defined|controller.based|northbound|southbound/i.test(text) ||
    /rest.?api|restful|crud|http verb/i.test(text) ||
    /\bjson\b|json.encoded/i.test(text) ||
    /\bansible\b|\bterraform\b|\bpuppet\b|\bchef\b/i.test(text) ||
    /\bpython\b|scripting/i.test(text) ||
    /automation|programmability/i.test(text) ||
    /\bnetconf\b|\brestconf\b|\byang\b/i.test(text) ||
    /cisco dna|dna center/i.test(text) ||
    /machine learning|\bai\b.*network|artificial intelligence/i.test(text) ||
    /control plane.*data plane|data plane.*control plane/i.test(text) ||
    q.subtopic === 'SDN & Automation'
  ) {
    return 'Automation and Programmability';
  }

  // 5.0 SECURITY
  if (
    /\bthreat\b|\bvulnerabilit|\bexploit|\bmitigation/i.test(text) ||
    /\bmalware\b|\bvirus\b|\btrojan\b|\bworm\b|\bransomware/i.test(text) ||
    /\battack\b|\bddos\b|denial.of.service|\bphishing/i.test(text) ||
    /man.in.the.middle|\bspoofing\b|social engineering/i.test(text) ||
    /enable secret|enable password|line.*password|service password/i.test(text) ||
    /password.*complexity|multifactor|mfa|\bbiometric/i.test(text) ||
    /\bvpn\b|\bipsec\b|site.to.site|remote access.*tunnel/i.test(text) ||
    /\bacl\b|\bacls\b|access.control.list|access.list/i.test(text) ||
    /permit\s+\d|deny\s+\d|permit.*host|deny.*host/i.test(text) ||
    /standard acl|extended acl|named acl/i.test(text) ||
    /dhcp snooping|dynamic arp inspection|\bdai\b/i.test(text) ||
    /port.security|sticky.*mac|violation.*mode/i.test(text) ||
    /bpdu guard|root guard|loop guard/i.test(text) ||
    /authentication.*authorization.*accounting/i.test(text) ||
    /\baaa\b.*concept|\baaa\b.*compare/i.test(text) ||
    /\bwpa\b|\bwpa2\b|\bwpa3\b|wireless.*security.*protocol/i.test(text) ||
    /\bwep\b.*security|tkip|ccmp|802\.11i/i.test(text) ||
    /wpa2.*psk|psk.*wpa2|pre.shared.key.*wlan/i.test(text) ||
    q.subtopic === 'Access Control Lists' ||
    q.subtopic === 'Port Security' ||
    q.subtopic === 'Layer 2 Security' ||
    q.subtopic === 'VPN' ||
    q.subtopic === 'Firewalls' ||
    q.subtopic === 'Security Threats'
  ) {
    return 'Security Fundamentals';
  }

  // 4.0 IP SERVICES
  if (
    /\bnat\b|\bpat\b|network address translation/i.test(text) ||
    /inside.*global|inside.*local|outside.*global|outside.*local/i.test(text) ||
    /ip nat inside|ip nat outside|ip nat pool|overload/i.test(text) ||
    /\bntp\b|network time protocol/i.test(text) ||
    /role of dhcp|role of dns|dhcp.*dns.*network/i.test(text) ||
    /\bsnmp\b|simple network management/i.test(text) ||
    /\bsyslog\b|logging.*facility|logging.*severity|logging.*level/i.test(text) ||
    /dhcp.*relay|ip helper.address|dhcp.*client/i.test(text) ||
    /ip dhcp pool|ip dhcp excluded|dhcp server/i.test(text) ||
    /\bqos\b|quality of service|classification.*marking|queuing|policing|shaping/i.test(text) ||
    /dscp|cos|traffic.*class|congestion/i.test(text) ||
    /ssh.*remote|remote.*ssh|configure.*ssh|ssh.*management/i.test(text) ||
    /crypto key|transport input ssh|ip ssh/i.test(text) ||
    /\btftp\b|\bftp\b.*network|file transfer/i.test(text) ||
    q.subtopic === 'NAT/PAT' ||
    q.subtopic === 'Network Management' ||
    q.subtopic === 'DNS'
  ) {
    return 'IP Services';
  }

  // 3.0 IP CONNECTIVITY (nur Routing!)
  if (
    /routing table|show ip route/i.test(text) ||
    /administrative distance|\bad\b.*routing|\bmetric\b.*routing/i.test(text) ||
    /gateway of last resort/i.test(text) ||
    /routing protocol code/i.test(text) ||
    /longest prefix match|forwarding decision|how.*router.*forward/i.test(text) ||
    /static route|default route|ip route\s+\d|floating static/i.test(text) ||
    /network route|host route.*static/i.test(text) ||
    /\bospf\b|open shortest path first/i.test(text) ||
    /neighbor adjacenc|ospf.*neighbor/i.test(text) ||
    /\bdr\b.*\bbdr\b|designated router/i.test(text) ||
    /router.id|ospf.*area/i.test(text) ||
    /link.state|lsa\b|spf algorithm/i.test(text) ||
    /\bhsrp\b|\bvrrp\b|\bglbp\b/i.test(text) ||
    /first hop redundancy|fhrp/i.test(text) ||
    /standby.*ip|virtual.*ip.*gateway/i.test(text) ||
    q.subtopic === 'OSPF' ||
    q.subtopic === 'Routing Fundamentals' ||
    q.subtopic === 'First Hop Redundancy'
  ) {
    return 'IP Connectivity';
  }

  // 2.0 NETWORK ACCESS
  if (
    /\bvlan\b|virtual.*lan/i.test(text) ||
    /access port|voice vlan|data vlan|default vlan/i.test(text) ||
    /inter.?vlan|router.on.a.stick|svi\b|switched virtual interface/i.test(text) ||
    /trunk port|\btrunking\b|802\.1q|dot1q/i.test(text) ||
    /native vlan|allowed vlan/i.test(text) ||
    /\bcdp\b|cisco discovery|lldp|link layer discovery/i.test(text) ||
    /etherchannel|port.channel|\blacp\b|\bpagp\b/i.test(text) ||
    /channel.group|port aggregation/i.test(text) ||
    /spanning.tree|\bstp\b|\brstp\b|rapid.pvst/i.test(text) ||
    /root bridge|root port|designated port|blocking.*forwarding/i.test(text) ||
    /portfast|bpdu filter/i.test(text) ||
    /wireless.*architecture|autonomous.*ap|lightweight.*ap|\bwlc\b/i.test(text) ||
    /capwap|flexconnect|local mode.*ap/i.test(text) ||
    /management access|device.*access.*method/i.test(text) ||
    /\btelnet\b.*management|\bconsole\b.*access/i.test(text) ||
    /tacacs|radius.*device|aaa.*server/i.test(text) ||
    /wlan.*gui|wireless.*controller.*gui/i.test(text) ||
    q.subtopic === 'VLANs' ||
    q.subtopic === 'Trunking' ||
    q.subtopic === 'EtherChannel' ||
    q.subtopic === 'Spanning Tree Protocol' ||
    q.subtopic === 'Inter-VLAN Routing' ||
    q.subtopic === 'Wireless LANs'
  ) {
    return 'Network Access';
  }

  // 1.0 NETWORK FUNDAMENTALS (default)
  return 'Network Fundamentals';
}

// Anwenden
console.log('Wende Blueprint-Kategorisierung an...\n');

let shifts = 0;
questions.forEach(q => {
  const newTopic = categorizeByBlueprint(q);
  if (newTopic !== q.topic) {
    q.topic = newTopic;
    shifts++;
  }
});

console.log(`${shifts} Fragen neu kategorisiert\n`);

// IDs neu vergeben
const topicPrefixes = {
  'Network Fundamentals': 'nf',
  'Network Access': 'na',
  'IP Connectivity': 'ic',
  'IP Services': 'is',
  'Security Fundamentals': 'sf',
  'Automation and Programmability': 'ap'
};

const byTopic = {};
questions.forEach(q => {
  if (!byTopic[q.topic]) byTopic[q.topic] = [];
  byTopic[q.topic].push(q);
});

Object.entries(byTopic).forEach(([topic, qs]) => {
  const prefix = topicPrefixes[topic];
  qs.sort((a, b) => {
    const numA = parseInt(a.id.split('-')[1]) || 0;
    const numB = parseInt(b.id.split('-')[1]) || 0;
    return numA - numB;
  });
  qs.forEach((q, idx) => {
    q.id = `${prefix}-${String(idx + 1).padStart(4, '0')}`;
  });
  console.log(`${topic}: ${qs.length} (${prefix}-0001 bis ${prefix}-${String(qs.length).padStart(4, '0')})`);
});

// Sortieren und speichern
data.questions.sort((a, b) => a.id.localeCompare(b.id));
data.lastUpdated = new Date().toISOString();

// Backup
const backupPath = dataPath.replace('.json', '.backup-pre-blueprint.json');
fs.writeFileSync(backupPath, fs.readFileSync(dataPath));
console.log(`\nBackup: ${backupPath}`);

// Speichern
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Gespeichert: ${dataPath}`);

// Zusammenfassung
const total = questions.length;
console.log('\n=== FINALE VERTEILUNG ===\n');
Object.entries(byTopic).forEach(([topic, qs]) => {
  const pct = (qs.length / total * 100).toFixed(1);
  console.log(`${topic}: ${qs.length} (${pct}%)`);
});
