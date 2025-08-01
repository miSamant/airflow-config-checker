import React, { useState } from 'react';
import { Calculator, Server, Cpu, HardDrive, Database, CheckCircle, AlertTriangle, Info, TrendingUp, Clock, Users } from 'lucide-react';

const AirflowConfigCalculator = () => {
  const [selectedVersion, setSelectedVersion] = useState('2.10.2');
  const [cpu, setCpu] = useState(4);
  const [ram, setRam] = useState(8);
  const [storage, setStorage] = useState(100);
  const [expectedDAGs, setExpectedDAGs] = useState(50);
  const [avgTasksPerDAG, setAvgTasksPerDAG] = useState(10);
  const [concurrentDAGs, setConcurrentDAGs] = useState(10);
  const [deploymentType, setDeploymentType] = useState('standalone');
  
  const airflowVersions = [
    { version: '2.6.0', released: '2023-04', status: 'stable', minPython: '3.8' },
    { version: '2.6.3', released: '2023-07', status: 'stable', minPython: '3.8' },
    { version: '2.7.0', released: '2023-08', status: 'stable', minPython: '3.8' },
    { version: '2.7.3', released: '2023-11', status: 'stable', minPython: '3.8' },
    { version: '2.8.0', released: '2024-01', status: 'stable', minPython: '3.8' },
    { version: '2.8.4', released: '2024-04', status: 'stable', minPython: '3.8' },
    { version: '2.9.0', released: '2024-06', status: 'stable', minPython: '3.9' },
    { version: '2.9.3', released: '2024-08', status: 'stable', minPython: '3.9' },
    { version: '2.10.0', released: '2024-10', status: 'recommended', minPython: '3.9' },
    { version: '2.10.2', released: '2024-12', status: 'recommended', minPython: '3.9' },
    { version: '2.10.4', released: '2025-02', status: 'latest', minPython: '3.9' },
    { version: '3.0.0', released: '2024-10', status: 'beta', minPython: '3.10' }
  ];

  const calculateOptimalConfig = () => {
    const totalTasks = expectedDAGs * avgTasksPerDAG;
    const peakConcurrentTasks = Math.min(concurrentDAGs * avgTasksPerDAG, totalTasks * 0.3);
    
    // Base calculations
    let recommendedWorkers = Math.max(2, Math.ceil(peakConcurrentTasks / 4));
    let recommendedSchedulers = deploymentType === 'kubernetes' ? Math.max(2, Math.ceil(expectedDAGs / 100)) : 1;
    
    // Adjust based on resources
    const maxWorkersByCPU = Math.floor(cpu / 0.5); // 0.5 CPU per worker minimum
    const maxWorkersByRAM = Math.floor(ram / 1); // 1GB RAM per worker minimum
    
    recommendedWorkers = Math.min(recommendedWorkers, maxWorkersByCPU, maxWorkersByRAM);
    
    // Database connections
    const dbConnections = Math.max(20, recommendedWorkers * 5 + recommendedSchedulers * 10);
    
    // Resource utilization
    const cpuUtilization = ((recommendedWorkers * 0.5 + recommendedSchedulers * 1) / cpu * 100);
    const ramUtilization = ((recommendedWorkers * 1 + recommendedSchedulers * 2) / ram * 100);
    
    return {
      workers: recommendedWorkers,
      schedulers: recommendedSchedulers,
      dbConnections,
      cpuUtilization: Math.round(cpuUtilization * 10) / 10,
      ramUtilization: Math.round(ramUtilization * 10) / 10,
      peakConcurrentTasks: Math.ceil(peakConcurrentTasks)
    };
  };

  const getVersionRecommendation = () => {
    const config = calculateOptimalConfig();
    const currentVersion = airflowVersions.find(v => v.version === selectedVersion);
    
    // Scoring system for version recommendation
    const versionScores = airflowVersions.map(version => {
      let score = 0;
      
      // Performance improvements in newer versions
      if (version.version >= '2.8.0') score += 2;
      if (version.version >= '2.9.0') score += 1;
      
      // Stability vs features trade-off
      if (version.status === 'recommended') score += 3;
      if (version.status === 'stable') score += 2;
      if (version.status === 'latest') score += 1;
      if (version.status === 'beta') score -= 2;
      
      // Resource efficiency
      if (config.cpuUtilization > 80 && version.version >= '2.8.0') score += 2;
      if (config.ramUtilization > 80 && version.version >= '2.7.0') score += 1;
      
      // High-scale optimizations
      if (expectedDAGs > 100 && version.version >= '2.8.0') score += 2;
      if (config.workers > 10 && version.version >= '2.9.0') score += 1;
      
      return { ...version, score };
    });
    
    const bestVersion = versionScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return {
      recommended: bestVersion,
      current: currentVersion,
      alternatives: versionScores.filter(v => v.score >= bestVersion.score - 1).slice(0, 3)
    };
  };

  const getPerformanceInsights = () => {
    const config = calculateOptimalConfig();
    const insights = [];
    
    if (config.cpuUtilization > 90) {
      insights.push({
        type: 'warning',
        message: 'CPU utilization is very high. Consider adding more CPU cores or reducing concurrent tasks.',
        icon: AlertTriangle
      });
    } else if (config.cpuUtilization > 70) {
      insights.push({
        type: 'info',
        message: 'CPU utilization is moderate. Monitor performance under load.',
        icon: Info
      });
    }
    
    if (config.ramUtilization > 85) {
      insights.push({
        type: 'warning',
        message: 'Memory utilization is high. Consider increasing RAM allocation.',
        icon: AlertTriangle
      });
    }
    
    if (config.workers < 2) {
      insights.push({
        type: 'info',
        message: 'Low worker count may create bottlenecks for parallel task execution.',
        icon: Info
      });
    }
    
    if (expectedDAGs > 200 && deploymentType === 'standalone') {
      insights.push({
        type: 'warning',
        message: 'High DAG count detected. Consider Kubernetes deployment for better scalability.',
        icon: TrendingUp
      });
    }
    
    if (config.peakConcurrentTasks > config.workers * 4) {
      insights.push({
        type: 'warning',
        message: 'Peak concurrent tasks may exceed worker capacity. Tasks will queue.',
        icon: Clock
      });
    }
    
    return insights;
  };

  const config = calculateOptimalConfig();
  const versionRec = getVersionRecommendation();
  const insights = getPerformanceInsights();

  // Airflow Logo SVG Component
  const AirflowLogo = ({ size = 80, className = "" }) => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
<path d="m2.5441 127 60.809-62.332a1.124 1.124 0 0 0 0.1359-1.4368c-3.6977-5.1625-10.521-6.0578-13.05-9.5268-7.4903-10.275-9.3909-16.092-12.61-15.731a0.98374 0.98374 0 0 0-0.58464 0.3085l-21.966 22.518c-12.638 12.944-14.454 41.475-14.782 65.367a1.1908 1.1908 0 0 0 2.0473 0.83273z" fill="#017cee"/>
<path d="m126.99 125.46-62.332-60.813a1.124 1.124 0 0 0-1.4389-0.1359c-5.1625 3.6998-6.0578 10.521-9.5268 13.05-10.275 7.4903-16.092 9.3909-15.731 12.61a0.98374 0.98374 0 0 0 0.3085 0.58248l22.518 21.966c12.944 12.638 41.475 14.454 65.367 14.782a1.1908 1.1908 0 0 0 0.83489-2.0408z" fill="#00ad46"/>
<path d="m60.792 112.72c-7.076-6.9035-10.355-20.559 3.2058-48.719-22.046 9.8525-29.771 22.803-25.972 26.511z" fill="#04d659"/>
<path d="m125.45 1.0113-60.807 62.332a1.1218 1.1218 0 0 0-0.1359 1.4368c3.6998 5.1625 10.519 6.0578 13.05 9.5268 7.4903 10.275 9.393 16.092 12.61 15.731a0.97943 0.97943 0 0 0 0.58464-0.3085l21.966-22.518c12.638-12.944 14.454-41.475 14.782-65.367a1.193 1.193 0 0 0-2.0495-0.83273z" fill="#00c7d4"/>
<path d="m112.73 67.211c-6.9035 7.076-20.559 10.355-48.721-3.2058 9.8525 22.046 22.803 29.771 26.511 25.972z" fill="#11e1ee"/>
<path d="m1.0017 2.5495 62.332 60.807a1.124 1.124 0 0 0 1.4368 0.1359c5.1625-3.6998 6.0578-10.521 9.5268-13.05 10.275-7.4903 16.092-9.3909 15.731-12.61a0.99022 0.99022 0 0 0-0.3085-0.58463l-22.518-21.966c-12.944-12.638-41.475-14.454-65.367-14.782a1.1908 1.1908 0 0 0-0.83273 2.0495z" fill="#e43921"/>
<path d="m67.212 15.284c7.076 6.9035 10.355 20.559-3.2058 48.721 22.046-9.8525 29.771-22.805 25.972-26.511z" fill="#ff7557"/>
<path d="m15.279 60.8c6.9035-7.076 20.559-10.355 48.721 3.2058-9.8525-22.046-22.803-29.771-26.511-25.972z" fill="#0cb6ff"/>
<circle cx="64.009" cy="63.995" r="2.7182" fill="#4a4848"/>
</svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-900 relative overflow-hidden">
      {/* Animated Airflow Logos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 animate-spin opacity-10">
          <AirflowLogo size={80} className="text-white" />
        </div>
        <div className="absolute top-32 right-20 opacity-10" style={{animation: "spin 8s linear infinite reverse"}}>
          <AirflowLogo size={60} className="text-white" />
        </div>
        <div className="absolute bottom-20 left-1/4 opacity-10" style={{animation: "spin 12s linear infinite"}}>
          <AirflowLogo size={100} className="text-white" />
        </div>
        <div className="absolute top-1/2 right-10 opacity-10" style={{animation: "spin 15s linear infinite reverse"}}>
          <AirflowLogo size={70} className="text-white" />
        </div>
        <div className="absolute bottom-10 right-1/3 opacity-10" style={{animation: "spin 10s linear infinite"}}>
          <AirflowLogo size={90} className="text-white" />
        </div>
      </div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Calculator className="h-12 w-12 text-white mr-3" />
              <h1 className="text-4xl font-bold text-white">Apache Airflow Config Calculator</h1>
            </div>
            <p className="text-xl text-blue-100">Optimize your Airflow deployment with intelligent configuration recommendations</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Configuration Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 sticky top-6 border border-white/20">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <Server className="h-6 w-6 mr-2 text-indigo-600" />
                  Configuration
                </h2>
                
                <div className="space-y-6">
                  {/* Airflow Version */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Airflow Version</label>
                    <select 
                      value={selectedVersion} 
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {airflowVersions.map(version => (
                        <option key={version.version} value={version.version}>
                          {version.version} ({version.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deployment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Type</label>
                    <select 
                      value={deploymentType} 
                      onChange={(e) => setDeploymentType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="standalone">Standalone</option>
                      <option value="docker">Docker Compose</option>
                      <option value="kubernetes">Kubernetes</option>
                      <option value="celery">Celery Executor</option>
                    </select>
                  </div>

                  {/* Resource Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Cpu className="inline h-4 w-4 mr-1" />
                        CPU Cores
                      </label>
                      <input 
                        type="number" 
                        value={cpu} 
                        onChange={(e) => setCpu(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max="128"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <HardDrive className="inline h-4 w-4 mr-1" />
                        RAM (GB)
                      </label>
                      <input 
                        type="number" 
                        value={ram} 
                        onChange={(e) => setRam(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max="512"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Database className="inline h-4 w-4 mr-1" />
                      Storage (GB)
                    </label>
                    <input 
                      type="number" 
                      value={storage} 
                      onChange={(e) => setStorage(Math.max(10, parseInt(e.target.value) || 10))}
                      min="10" 
                      max="1000"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {/* Workload Configuration */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Workload Profile</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected DAGs</label>
                        <input 
                          type="number" 
                          value={expectedDAGs} 
                          onChange={(e) => setExpectedDAGs(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1" 
                          max="1000"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Avg Tasks per DAG</label>
                        <input 
                          type="number" 
                          value={avgTasksPerDAG} 
                          onChange={(e) => setAvgTasksPerDAG(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1" 
                          max="100"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Concurrent DAGs</label>
                        <input 
                          type="number" 
                          value={concurrentDAGs} 
                          onChange={(e) => setConcurrentDAGs(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1" 
                          max="100"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recommended Configuration */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                  Recommended Configuration
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{config.workers}</div>
                    <div className="text-sm text-gray-600">Workers</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-purple-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Server className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{config.schedulers}</div>
                    <div className="text-sm text-gray-600">Schedulers</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Database className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{config.dbConnections}</div>
                    <div className="text-sm text-gray-600">DB Connections</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-orange-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{config.peakConcurrentTasks}</div>
                    <div className="text-sm text-gray-600">Peak Tasks</div>
                  </div>
                </div>
                
                {/* Resource Utilization */}
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">CPU Utilization</span>
                      <span className="text-sm text-gray-600">{config.cpuUtilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${config.cpuUtilization > 80 ? 'bg-red-500' : config.cpuUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(config.cpuUtilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">RAM Utilization</span>
                      <span className="text-sm text-gray-600">{config.ramUtilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${config.ramUtilization > 80 ? 'bg-red-500' : config.ramUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(config.ramUtilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Version Recommendation */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Version Recommendation</h2>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Recommended: Apache Airflow {versionRec.recommended.version}</h3>
                      <p className="text-gray-600 mt-1">
                        Status: {versionRec.recommended.status} • Released: {versionRec.recommended.released} • Min Python: {versionRec.recommended.minPython}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">Score: {versionRec.recommended.score}</div>
                    </div>
                  </div>
                </div>
                
                {versionRec.current.version !== versionRec.recommended.version && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">
                        Your selected version ({versionRec.current.version}) is not optimal for your configuration.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {versionRec.alternatives.map((version, index) => (
                    <div key={version.version} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{version.version}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          version.status === 'recommended' ? 'bg-green-100 text-green-800' :
                          version.status === 'stable' ? 'bg-blue-100 text-blue-800' :
                          version.status === 'latest' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {version.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Score: {version.score}</p>
                      <p className="text-xs text-gray-500">Released: {version.released}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Insights */}
              {insights.length > 0 && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6">Performance Insights</h2>
                  
                  <div className="space-y-4">
                    {insights.map((insight, index) => {
                      const IconComponent = insight.icon;
                      return (
                        <div key={index} className={`flex items-start p-4 rounded-lg ${
                          insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
                        }`}> 
                          <IconComponent className={`h-5 w-5 mr-3 mt-0.5 ${
                            insight.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                          <p className={`text-sm ${
                            insight.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                          }`}> 
                            {insight.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Configuration Export */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Export Configuration</h2>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
{`# Recommended Airflow Configuration
# Version: ${selectedVersion}
# Deployment: ${deploymentType}

# Resources
CPU_CORES = ${cpu}
MEMORY_GB = ${ram}
STORAGE_GB = ${storage}

# Airflow Settings
AIRFLOW_VERSION = "${selectedVersion}"
AIRFLOW__CORE__EXECUTOR = "${deploymentType === 'kubernetes' ? 'KubernetesExecutor' : 'CeleryExecutor'}"
AIRFLOW__CORE__MAX_ACTIVE_TASKS_PER_DAG = ${avgTasksPerDAG}
AIRFLOW__CORE__MAX_ACTIVE_RUNS_PER_DAG = ${Math.ceil(concurrentDAGs / expectedDAGs * 16)}
AIRFLOW__CORE__PARALLELISM = ${config.workers * 4}
AIRFLOW__CELERY__WORKER_CONCURRENCY = 4
AIRFLOW__CORE__SQL_ALCHEMY_POOL_SIZE = ${Math.ceil(config.dbConnections / 2)}
AIRFLOW__CORE__SQL_ALCHEMY_MAX_OVERFLOW = ${Math.ceil(config.dbConnections / 4)}

# Recommended Setup
WORKERS = ${config.workers}
SCHEDULERS = ${config.schedulers}
DB_CONNECTIONS = ${config.dbConnections}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

export default AirflowConfigCalculator;