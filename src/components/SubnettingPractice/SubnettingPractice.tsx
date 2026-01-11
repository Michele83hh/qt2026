import { useState } from 'react';

type Mode = 'select' | 'ipv4' | 'ipv6';

interface SubnettingPracticeProps {
  onExit: () => void;
}

interface IPv4Problem {
  ip: string;
  prefix: number;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  subnetMask: string;
}

interface IPv6Problem {
  address: string;
  prefix: number;
  networkAddress: string;
  firstAddress: string;
  lastAddress: string;
  type: string; // Global Unicast, Link-Local, etc.
}

export default function SubnettingPractice({ onExit }: SubnettingPracticeProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [ipv4Problem, setIpv4Problem] = useState<IPv4Problem | null>(null);
  const [ipv6Problem, setIpv6Problem] = useState<IPv6Problem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Helper Function - Evaluate power expressions like "2^24-2" or "2^8 - 2"
  const evaluatePowerExpression = (input: string): number | null => {
    if (!input) return null;

    // Remove spaces
    const cleaned = input.replace(/\s/g, '');

    // Check if it's a simple number
    if (/^\d+$/.test(cleaned)) {
      return parseInt(cleaned, 10);
    }

    // Check for power expression: 2^n, 2^n-2, 2**n, 2**n-2
    const powerMatch = cleaned.match(/^2[\^*]{1,2}(\d+)(-2)?$/);
    if (powerMatch) {
      const exponent = parseInt(powerMatch[1], 10);
      const subtractTwo = !!powerMatch[2];
      const result = Math.pow(2, exponent);
      return subtractTwo ? result - 2 : result;
    }

    return null;
  };

  // IPv6 Helper Function - Normalize for comparison
  const normalizeIPv6 = (addr: string): string => {
    if (!addr) return '';

    // Expand :: to full zeros first
    let expanded = addr.toLowerCase();

    // Handle :: expansion
    if (expanded.includes('::')) {
      const parts = expanded.split('::');
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      const middle = Array(missing).fill('0');
      expanded = [...left, ...middle, ...right].join(':');
    }

    // Split into segments, normalize each (pad to 4 digits for consistency)
    const segments = expanded.split(':').map(seg => {
      const padded = seg.padStart(4, '0');
      return padded;
    });

    return segments.join(':');
  };

  // IPv4 Helper Functions
  const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  };

  const numberToIp = (num: number): string => {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  };

  const prefixToMask = (prefix: number): string => {
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    return numberToIp(mask);
  };

  const generateIPv4Problem = (): IPv4Problem => {
    // Generate random IP and prefix
    const octets = [
      Math.floor(Math.random() * 223) + 1, // 1-223 (avoid class D/E)
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256)
    ];
    const ip = octets.join('.');
    const prefix = Math.floor(Math.random() * 23) + 8; // /8 to /30

    // Calculate network details
    const ipNum = ipToNumber(ip);
    const maskNum = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const networkNum = (ipNum & maskNum) >>> 0;
    const broadcastNum = (networkNum | (~maskNum >>> 0)) >>> 0;

    const totalHosts = Math.pow(2, 32 - prefix);
    const usableHosts = totalHosts - 2;

    return {
      ip,
      prefix,
      networkAddress: numberToIp(networkNum),
      broadcastAddress: numberToIp(broadcastNum),
      firstHost: numberToIp(networkNum + 1),
      lastHost: numberToIp(broadcastNum - 1),
      totalHosts,
      usableHosts,
      subnetMask: prefixToMask(prefix)
    };
  };

  const generateIPv6Problem = (): IPv6Problem => {
    // Generate random IPv6 address
    const types = [
      { type: 'Global Unicast', prefix: '2001' },
      { type: 'Link-Local', prefix: 'fe80' },
      { type: 'Unique Local', prefix: 'fd00' }
    ];

    const selected = types[Math.floor(Math.random() * types.length)];
    const segments = [selected.prefix];

    for (let i = 1; i < 8; i++) {
      segments.push(Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'));
    }

    const address = segments.join(':');
    const prefix = selected.type === 'Link-Local' ? 64 : (Math.floor(Math.random() * 49) + 48); // /48 to /96 or 64 for link-local

    // Calculate network address correctly
    // Convert each segment to binary, apply prefix mask, convert back
    const fullBinary = segments.map(seg => parseInt(seg, 16).toString(2).padStart(16, '0')).join('');

    // Keep first 'prefix' bits, zero out the rest for network address
    const networkBinary = fullBinary.substring(0, prefix).padEnd(128, '0');

    // Convert back to IPv6 segments
    const networkSegments: string[] = [];
    for (let i = 0; i < 8; i++) {
      const segmentBinary = networkBinary.substring(i * 16, (i + 1) * 16);
      networkSegments.push(parseInt(segmentBinary, 2).toString(16).padStart(4, '0'));
    }
    const networkAddress = networkSegments.join(':');

    // Calculate first usable address (network + 1, but for IPv6 typically network address itself is usable)
    // For simplicity, first address = network address
    const firstAddress = networkAddress;

    // Calculate last address (all host bits set to 1)
    const lastBinary = fullBinary.substring(0, prefix).padEnd(128, '1');
    const lastSegments: string[] = [];
    for (let i = 0; i < 8; i++) {
      const segmentBinary = lastBinary.substring(i * 16, (i + 1) * 16);
      lastSegments.push(parseInt(segmentBinary, 2).toString(16).padStart(4, '0'));
    }
    const lastAddress = lastSegments.join(':');

    return {
      address,
      prefix,
      networkAddress,
      firstAddress,
      lastAddress,
      type: selected.type
    };
  };

  const startIPv4Practice = () => {
    setMode('ipv4');
    setIpv4Problem(generateIPv4Problem());
    setAnswers({});
    setSubmitted(false);
  };

  const startIPv6Practice = () => {
    setMode('ipv6');
    setIpv6Problem(generateIPv6Problem());
    setAnswers({});
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (mode === 'ipv4' && ipv4Problem) {
      let correct = 0;
      let total = 6;

      if (answers.networkAddress === ipv4Problem.networkAddress) correct++;
      if (answers.broadcastAddress === ipv4Problem.broadcastAddress) correct++;
      if (answers.firstHost === ipv4Problem.firstHost) correct++;
      if (answers.lastHost === ipv4Problem.lastHost) correct++;
      if (evaluatePowerExpression(answers.usableHosts || '') === ipv4Problem.usableHosts) correct++;
      if (answers.subnetMask === ipv4Problem.subnetMask) correct++;

      setScore({ correct, total });
      setSubmitted(true);
    } else if (mode === 'ipv6' && ipv6Problem) {
      let correct = 0;
      let total = 4;

      if (normalizeIPv6(answers.networkAddress || '') === normalizeIPv6(ipv6Problem.networkAddress)) correct++;
      if (normalizeIPv6(answers.firstAddress || '') === normalizeIPv6(ipv6Problem.firstAddress)) correct++;
      if (normalizeIPv6(answers.lastAddress || '') === normalizeIPv6(ipv6Problem.lastAddress)) correct++;
      if (answers.type?.toLowerCase() === ipv6Problem.type.toLowerCase()) correct++;

      setScore({ correct, total });
      setSubmitted(true);
    }
  };

  const nextProblem = () => {
    if (mode === 'ipv4') {
      setIpv4Problem(generateIPv4Problem());
    } else {
      setIpv6Problem(generateIPv6Problem());
    }
    setAnswers({});
    setSubmitted(false);
  };

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border border-white/20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-4xl">🔢</span>
                </div>
                <h2 className="text-5xl font-black text-white">Subnetting Practice</h2>
              </div>
              <p className="text-xl text-white/90">Choose your practice mode</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* IPv4 Mode */}
              <button
                onClick={startIPv4Practice}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🔢</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">IPv4 Subnetting</h3>
                <p className="text-white/70">Practice calculating network addresses, broadcast addresses, and host ranges for IPv4 networks.</p>
                <div className="mt-4 px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-400/30 inline-block">
                  <span className="text-white font-bold">CIDR /8 to /30</span>
                </div>
              </button>

              {/* IPv6 Mode */}
              <button
                onClick={startIPv6Practice}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🌐</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">IPv6 Subnetting</h3>
                <p className="text-white/70">Practice with IPv6 addresses, network prefixes, and address type identification.</p>
                <div className="mt-4 px-4 py-2 bg-purple-500/20 rounded-xl border border-purple-400/30 inline-block">
                  <span className="text-white font-bold">Global / Link-Local / ULA</span>
                </div>
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={onExit}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-10 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IPv4 Practice Screen
  if (mode === 'ipv4' && ipv4Problem) {
    return (
      <div className="min-h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🔢</span>
                </div>
                <div>
                  <div className="text-sm text-white/80 font-semibold">Subnetting Practice</div>
                  <div className="text-xl font-black">IPv4 Mode</div>
                </div>
              </div>
              {submitted && (
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <div className="text-2xl font-black">{score.correct}/{score.total}</div>
                  <div className="text-xs text-white/80">Score</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            <h3 className="text-2xl font-black text-white mb-6">Problem</h3>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <div className="text-center">
                <div className="text-white/70 text-sm mb-2">Given IP Address</div>
                <div className="text-4xl font-black text-white mb-2">{ipv4Problem.ip}/{ipv4Problem.prefix}</div>
                <div className="text-white/60">Calculate the subnet details</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-bold mb-2">Network Address</label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.0"
                  value={answers.networkAddress || ''}
                  onChange={(e) => setAnswers({ ...answers, networkAddress: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                    submitted
                      ? answers.networkAddress === ipv4Problem.networkAddress
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                />
                {submitted && answers.networkAddress !== ipv4Problem.networkAddress && (
                  <div className="mt-2 text-green-300 font-mono">Correct: {ipv4Problem.networkAddress}</div>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-2">Broadcast Address</label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.255"
                  value={answers.broadcastAddress || ''}
                  onChange={(e) => setAnswers({ ...answers, broadcastAddress: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                    submitted
                      ? answers.broadcastAddress === ipv4Problem.broadcastAddress
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                />
                {submitted && answers.broadcastAddress !== ipv4Problem.broadcastAddress && (
                  <div className="mt-2 text-green-300 font-mono">Correct: {ipv4Problem.broadcastAddress}</div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-bold mb-2">First Host</label>
                  <input
                    type="text"
                    placeholder="e.g., 192.168.1.1"
                    value={answers.firstHost || ''}
                    onChange={(e) => setAnswers({ ...answers, firstHost: e.target.value })}
                    disabled={submitted}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                      submitted
                        ? answers.firstHost === ipv4Problem.firstHost
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                        : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                    } focus:outline-none backdrop-blur-sm`}
                  />
                  {submitted && answers.firstHost !== ipv4Problem.firstHost && (
                    <div className="mt-2 text-green-300 font-mono text-sm">Correct: {ipv4Problem.firstHost}</div>
                  )}
                </div>

                <div>
                  <label className="block text-white font-bold mb-2">Last Host</label>
                  <input
                    type="text"
                    placeholder="e.g., 192.168.1.254"
                    value={answers.lastHost || ''}
                    onChange={(e) => setAnswers({ ...answers, lastHost: e.target.value })}
                    disabled={submitted}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                      submitted
                        ? answers.lastHost === ipv4Problem.lastHost
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                        : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                    } focus:outline-none backdrop-blur-sm`}
                  />
                  {submitted && answers.lastHost !== ipv4Problem.lastHost && (
                    <div className="mt-2 text-green-300 font-mono text-sm">Correct: {ipv4Problem.lastHost}</div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-bold mb-2">Usable Hosts</label>
                  <input
                    type="text"
                    placeholder="e.g., 254 or 2^8-2"
                    value={answers.usableHosts || ''}
                    onChange={(e) => setAnswers({ ...answers, usableHosts: e.target.value })}
                    disabled={submitted}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                      submitted
                        ? evaluatePowerExpression(answers.usableHosts || '') === ipv4Problem.usableHosts
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                        : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                    } focus:outline-none backdrop-blur-sm`}
                  />
                  {submitted && evaluatePowerExpression(answers.usableHosts || '') !== ipv4Problem.usableHosts && (
                    <div className="mt-2 text-green-300 font-mono text-sm">Correct: {ipv4Problem.usableHosts} (2^{32 - ipv4Problem.prefix}-2)</div>
                  )}
                </div>

                <div>
                  <label className="block text-white font-bold mb-2">Subnet Mask</label>
                  <input
                    type="text"
                    placeholder="e.g., 255.255.255.0"
                    value={answers.subnetMask || ''}
                    onChange={(e) => setAnswers({ ...answers, subnetMask: e.target.value })}
                    disabled={submitted}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg ${
                      submitted
                        ? answers.subnetMask === ipv4Problem.subnetMask
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                        : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                    } focus:outline-none backdrop-blur-sm`}
                  />
                  {submitted && answers.subnetMask !== ipv4Problem.subnetMask && (
                    <div className="mt-2 text-green-300 font-mono text-sm">Correct: {ipv4Problem.subnetMask}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setMode('select')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
            >
              ← Back
            </button>
            {!submitted ? (
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Check Answers
              </button>
            ) : (
              <button
                onClick={nextProblem}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Next Problem →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // IPv6 Practice Screen
  if (mode === 'ipv6' && ipv6Problem) {
    return (
      <div className="min-h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🌐</span>
                </div>
                <div>
                  <div className="text-sm text-white/80 font-semibold">Subnetting Practice</div>
                  <div className="text-xl font-black">IPv6 Mode</div>
                </div>
              </div>
              {submitted && (
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <div className="text-2xl font-black">{score.correct}/{score.total}</div>
                  <div className="text-xs text-white/80">Score</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            <h3 className="text-2xl font-black text-white mb-6">Problem</h3>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <div className="text-center">
                <div className="text-white/70 text-sm mb-2">Given IPv6 Address</div>
                <div className="text-2xl md:text-3xl font-black text-white mb-2 break-all">{ipv6Problem.address}/{ipv6Problem.prefix}</div>
                <div className="text-white/60">Calculate the network details</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-bold mb-2">Network Address</label>
                <input
                  type="text"
                  placeholder="e.g., 2001:0db8:0000:0000:0000:0000:0000:0000"
                  value={answers.networkAddress || ''}
                  onChange={(e) => setAnswers({ ...answers, networkAddress: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-sm md:text-lg ${
                    submitted
                      ? normalizeIPv6(answers.networkAddress || '') === normalizeIPv6(ipv6Problem.networkAddress)
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                />
                {submitted && normalizeIPv6(answers.networkAddress || '') !== normalizeIPv6(ipv6Problem.networkAddress) && (
                  <div className="mt-2 text-green-300 font-mono text-sm break-all">Correct: {ipv6Problem.networkAddress}</div>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-2">First Usable Address</label>
                <input
                  type="text"
                  placeholder="e.g., 2001:0db8:0000:0000:0000:0000:0000:0000"
                  value={answers.firstAddress || ''}
                  onChange={(e) => setAnswers({ ...answers, firstAddress: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-sm md:text-lg ${
                    submitted
                      ? normalizeIPv6(answers.firstAddress || '') === normalizeIPv6(ipv6Problem.firstAddress)
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                />
                {submitted && normalizeIPv6(answers.firstAddress || '') !== normalizeIPv6(ipv6Problem.firstAddress) && (
                  <div className="mt-2 text-green-300 font-mono text-sm break-all">Correct: {ipv6Problem.firstAddress}</div>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-2">Last Usable Address</label>
                <input
                  type="text"
                  placeholder="e.g., 2001:0db8:0000:0000:ffff:ffff:ffff:ffff"
                  value={answers.lastAddress || ''}
                  onChange={(e) => setAnswers({ ...answers, lastAddress: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-sm md:text-lg ${
                    submitted
                      ? normalizeIPv6(answers.lastAddress || '') === normalizeIPv6(ipv6Problem.lastAddress)
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                />
                {submitted && normalizeIPv6(answers.lastAddress || '') !== normalizeIPv6(ipv6Problem.lastAddress) && (
                  <div className="mt-2 text-green-300 font-mono text-sm break-all">Correct: {ipv6Problem.lastAddress}</div>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-2">Address Type</label>
                <select
                  value={answers.type || ''}
                  onChange={(e) => setAnswers({ ...answers, type: e.target.value })}
                  disabled={submitted}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-lg ${
                    submitted
                      ? answers.type?.toLowerCase() === ipv6Problem.type.toLowerCase()
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/10 border-white/30 text-white focus:border-white/60'
                  } focus:outline-none backdrop-blur-sm`}
                >
                  <option value="" className="bg-gray-800">Select type...</option>
                  <option value="Global Unicast" className="bg-gray-800">Global Unicast</option>
                  <option value="Link-Local" className="bg-gray-800">Link-Local</option>
                  <option value="Unique Local" className="bg-gray-800">Unique Local</option>
                </select>
                {submitted && answers.type?.toLowerCase() !== ipv6Problem.type.toLowerCase() && (
                  <div className="mt-2 text-green-300">Correct: {ipv6Problem.type}</div>
                )}
              </div>

              {submitted && (
                <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-400/30">
                  <h4 className="text-white font-bold mb-2">IPv6 Type Hints:</h4>
                  <ul className="text-white/80 text-sm space-y-1">
                    <li>• <strong>2000::/3</strong> → Global Unicast (routable on internet)</li>
                    <li>• <strong>fe80::/10</strong> → Link-Local (local network only)</li>
                    <li>• <strong>fd00::/8</strong> → Unique Local (private, like RFC 1918)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setMode('select')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
            >
              ← Back
            </button>
            {!submitted ? (
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Check Answers
              </button>
            ) : (
              <button
                onClick={nextProblem}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Next Problem →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
