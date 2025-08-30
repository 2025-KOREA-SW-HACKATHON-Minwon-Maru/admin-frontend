"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  Star,
  MoreVertical,
  Eye,
  Download,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
// NOTE: 기존 atsApi를 쓰고 싶으면 아래 라인을 atsApi로 바꾸세요.
import { atsApi } from "../../services/civilApi";

export function CivilDashboard() {
  const [stats, setStats] = useState({
    totalComplaints: 0, // 총 민원 수
    activeCases: 0, // 진행 중
    satisfactionRate: 0, // 만족도(%) 평균
    avgResponseTimeHrs: 0, // 1차 응답 평균 시간(시간 단위)
  });

  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState({ available: false, url: "" });
  const [modeInfo, setModeInfo] = useState(atsApi.getModeInfo());

  // Dashboard datasets
  const [dashboardData, setDashboardData] = useState({
    monthlyComplaints: [] as { month: string; count: number; resolved: number }[],
    categoryDistribution: [] as { name: string; value: number; color: string }[],
    processingQueue: [] as { id: string | number; name: string; progress: number }[],
    satisfactionDistribution: [] as { name: string; value: number }[],
    statusBreakdown: [] as { name: string; value: number }[],
    channelBreakdown: [] as { name: string; value: number }[],
  });

  useEffect(() => {
    checkBackendStatus();
    loadDashboardData();

    const interval = setInterval(() => {
      checkBackendStatus();
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkBackendStatus = async () => {
    const status = atsApi.getBackendStatus();
    const info = atsApi.getModeInfo();
    setBackendStatus(status);
    setModeInfo(info);
  };

  const retryBackendConnection = async () => {
    setIsLoading(true);
    const connected = await atsApi.retryConnection();
    setBackendStatus(atsApi.getBackendStatus());
    setModeInfo(atsApi.getModeInfo());

    if (connected) {
      await loadDashboardData();
    }
    setIsLoading(false);
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1) 민원 리스트 로드 (예: [{ id, title, status, category, priority, channel, createdAt, firstResponseAt, resolvedAt, satisfactionScore }, ...])
      const complaints = await atsApi.getAllComplaints();

      // 최근 접수 4건
      const sorted = [...complaints].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentComplaints(sorted.slice(0, 4));

      // 진행 중
      const active = complaints.filter((c: any) =>
        ["received", "in_progress", "pending"].includes(c.status)
      );

      // 만족도 평균
      const rated = complaints.filter((c: any) => typeof c.satisfactionScore === "number");
      const satisfactionAvg =
        rated.length > 0
          ? Math.round(
              (rated.reduce((acc: number, c: any) => acc + (c.satisfactionScore ?? 0), 0) /
                rated.length) *
                10
            ) / 10
          : 0;

      // 1차 응답 평균 시간(시간)
      const responded = complaints.filter((c: any) => c.firstResponseAt);
      const avgRespHours =
        responded.length > 0
          ? Math.round(
              (responded.reduce((acc: number, c: any) => {
                const start = new Date(c.createdAt).getTime();
                const first = new Date(c.firstResponseAt).getTime();
                return acc + Math.max(0, first - start);
              }, 0) /
                responded.length /
                (1000 * 60 * 60)) *
                10
            ) / 10
          : 0;

      setStats({
        totalComplaints: complaints.length,
        activeCases: active.length,
        satisfactionRate: satisfactionAvg, // 0~5점이면 변환해서 100점 환산하도록 바꿔도 됨
        avgResponseTimeHrs: avgRespHours,
      });

      // 2) 차트용 데이터 생성
      const monthly = generateMonthlyData(complaints);
      const categoryDist = generateCategoryDistribution(complaints);
      const satDist = generateSatisfactionDistribution(complaints);
      const statusDist = generateStatusBreakdown(complaints);
      const channelDist = generateChannelBreakdown(complaints);

      // 진행 중 큐 (progress는 예시)
      const processingQueue = active.slice(0, 8).map((c: any) => ({
        id: c.id,
        name: c.title || c.category || `민원 #${c.id}`,
        progress:
          c.status === "received"
            ? 15 + Math.random() * 10
            : c.status === "in_progress"
            ? 35 + Math.random() * 40
            : 75 + Math.random() * 20,
      }));

      setDashboardData({
        monthlyComplaints: monthly,
        categoryDistribution: categoryDist,
        processingQueue,
        satisfactionDistribution: satDist,
        statusBreakdown: statusDist,
        channelBreakdown: channelDist,
      });

      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Generators -----

  const generateMonthlyData = (complaints: any[]) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const monthly = months.map((m) => ({ month: m, count: 0, resolved: 0 }));
    complaints.forEach((c) => {
      const d = new Date(c.createdAt);
      const idx = d.getMonth(); // 0~11
      if (idx < months.length) {
        monthly[idx].count += 1;
      }
      if (c.status === "resolved") {
        const r = new Date(c.resolvedAt || c.updatedAt || c.createdAt);
        const ridx = r.getMonth();
        if (ridx < months.length) {
          monthly[ridx].resolved += 1;
        }
      }
    });
    // 빈 달에 데모용 기본치 살짝 넣기(데모 모드 고려)
    return monthly.map((m) => ({
      ...m,
      count: m.count || Math.floor(Math.random() * 30) + 10,
      resolved: m.resolved || Math.floor(Math.random() * 20) + 5,
    }));
  };

  const generateCategoryDistribution = (complaints: any[]) => {
    // 밝은회색 → 진회색 그라데이션
    const colors = ["#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#374151"];
    const count: Record<string, number> = {};
    complaints.forEach((c) => {
      const key = c.category || "기타";
      count[key] = (count[key] || 0) + 1;
    });
    const sorted = Object.entries(count)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);
  
    if (sorted.length === 0) {
      return [
        { name: "시설·환경", value: 18, color: colors[0] },
        { name: "교통·도로", value: 14, color: colors[1] },
        { name: "복지·민생", value: 12, color: colors[2] },
        { name: "안전·치안", value: 9,  color: colors[3] },
        { name: "기타",     value: 7,  color: colors[4] },
      ];
    }
  
    return sorted.map(([name, value], i) => ({
      name,
      value: value as number,
      color: colors[i] || "#6B7280",
    }));
  };
  

  const generateSatisfactionDistribution = (complaints: any[]) => {
    // 1~5점 구간화
    const bins = [
      { name: "1점", min: 1, max: 1.9, count: 0 },
      { name: "2점", min: 2, max: 2.9, count: 0 },
      { name: "3점", min: 3, max: 3.9, count: 0 },
      { name: "4점", min: 4, max: 4.5, count: 0 },
      { name: "5점", min: 4.6, max: 5.1, count: 0 },
    ];
    complaints.forEach((c) => {
      if (typeof c.satisfactionScore === "number") {
        const s = c.satisfactionScore;
        const b = bins.find((b) => s >= b.min && s <= b.max);
        if (b) b.count++;
      }
    });
    return bins.map((b) => ({ name: b.name, value: b.count }));
  };

  const generateStatusBreakdown = (complaints: any[]) => {
    const map: Record<string, number> = {};
    complaints.forEach((c) => {
      const s = c.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    const label = (s: string) =>
      s === "received"
        ? "접수"
        : s === "in_progress"
        ? "처리중"
        : s === "pending"
        ? "보류"
        : s === "resolved"
        ? "완료"
        : s === "rejected"
        ? "반려"
        : "기타";
    return Object.entries(map).map(([k, v]) => ({ name: label(k), value: v }));
  };

  const generateChannelBreakdown = (complaints: any[]) => {
    const map: Record<string, number> = {};
    complaints.forEach((c) => {
      const ch = c.channel || "unknown";
      map[ch] = (map[ch] || 0) + 1;
    });
    const label = (c: string) =>
      c === "web"
        ? "웹"
        : c === "mobile"
        ? "모바일"
        : c === "phone"
        ? "전화"
        : c === "visit"
        ? "방문"
        : "기타";
    // 상위 5
    return Object.entries(map)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([k, v]) => ({ name: label(k), value: v as number }));
  };

  // ----- UI helpers -----

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-white text-gray-800 border border-gray-300";
      case "in_progress":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      case "received":
        return "bg-gray-50 text-gray-600 border border-gray-200";
      case "rejected":
        return "bg-white text-red-600 border border-red-300";
      default:
        return "bg-white text-gray-500 border border-gray-200";
    }
  };
  

  const getScoreColor = (score?: number) => {
    if (typeof score !== "number") return "text-gray-600";
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-emerald-600";
    if (score >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  // Glassmorphism styles
  const glassStyle = {
    backdropFilter: "blur(12px)",
    background: "rgba(255, 255, 255, 0.85)",  // 흰색 기반
    border: "1px solid rgba(0, 0, 0, 0.1)",   // 얇은 검정 테두리
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.08)", // 은은한 그림자
  } as React.CSSProperties;
  

  const BackendStatusIndicator = () => (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
        backendStatus.available
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-blue-100 text-blue-700 border border-blue-200"
      }`}
    >
      {backendStatus.available ? (
        <>
          <Zap className="w-4 h-4" />
          <span>민원 AI 백엔드 연결됨</span>
        </>
      ) : (
        <>
          <Info className="w-4 h-4" />
          <span>데모 모드</span>
          <button
            onClick={retryBackendConnection}
            className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs hover:bg-blue-300 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "확인 중..." : "연결 시도"}
          </button>
        </>
      )}
    </div>
  );

  const ModeInfoBanner = () => (
    <div
      className={`rounded-2xl p-6 shadow-xl ${
        modeInfo.mode === "backend" ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"
      }`}
      style={glassStyle}
    >
      <div className="flex items-start gap-4">
        {modeInfo.mode === "backend" ? (
          <Zap className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        ) : (
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        )}
        <div className="flex-1">
          <h3
            className={`text-lg mb-2 ${modeInfo.mode === "backend" ? "text-green-800" : "text-blue-800"}`}
          >
            {modeInfo.mode === "backend" ? "AI 백엔드 연결됨" : "데모 모드 활성화"}
          </h3>
          <p
            className={`text-sm mb-3 ${modeInfo.mode === "backend" ? "text-green-700" : "text-blue-700"}`}
          >
            {modeInfo.mode === "backend"
              ? "실제 NLP 분류(민원 카테고리/우선순위), SLA 지연 탐지, 자동 배정 추천이 동작합니다."
              : "실제 운영 화면과 동일한 데모 데이터를 통해 기능을 체험할 수 있습니다."}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {modeInfo.features.slice(0, 4).map((f: string, i: number) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs ${
                  modeInfo.mode === "backend" ? "text-green-700" : "text-blue-700"
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {modeInfo.mode === "demo" && (
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">실데이터 분석을 쓰려면 Python 백엔드를 구성하세요 →</span>
                <div className="flex gap-2">
                  <button
                    onClick={retryBackendConnection}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "연결 중..." : "연결 재시도"}
                  </button>
                  <a
                    href="/backend/COMPLETE_SETUP_GUIDE.md"
                    target="_blank"
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    Setup Guide
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-8 shadow-xl text-center" style={glassStyle}>
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl mb-2">대시보드 오류</h2>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            민원 통계 대시보드
          </h1>
          <p className="text-gray-600 mt-1">민원 접수·처리 현황과 만족도를 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-4">
          <BackendStatusIndicator />
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            style={glassStyle}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 text-gray-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="rounded-xl px-6 py-3 shadow-lg border border-white/30" style={glassStyle}>
            <span className="text-sm text-gray-700">업데이트: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Mode Banner */}
      <ModeInfoBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" style={glassStyle}>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+12%</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl text-gray-800">{stats.totalComplaints.toLocaleString()}</h3>
            <p className="text-sm text-gray-600 mt-1">총 민원 접수</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" style={glassStyle}>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+8%</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl text-gray-800">{stats.activeCases}</h3>
            <p className="text-sm text-gray-600 mt-1">진행 중 민원</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" style={glassStyle}>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+5%</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl text-gray-800">{stats.satisfactionRate}</h3>
            <p className="text-sm text-gray-600 mt-1">평균 만족도(1~5)</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" style={glassStyle}>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center text-red-600">
              <Activity className="w-4 h-4 mr-1" />
              <span className="text-sm">-0.6h</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl text-gray-800">{stats.avgResponseTimeHrs} h</h3>
            <p className="text-sm text-gray-600 mt-1">평균 1차 응답시간</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 접수 추이 */}
        <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg text-gray-800">월별 민원 접수/완료</h3>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dashboardData.monthlyComplaints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Area
  type="monotone"
  dataKey="count"
  name="접수"
  stroke="#374151"      // 진회색
  fill="url(#gradient1)"
  strokeWidth={2}
/>
<Line
  type="monotone"
  dataKey="resolved"
  name="완료"
  stroke="#9CA3AF"      // 밝은 회색
  strokeWidth={2}
/>
<defs>
  <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#6B7280" stopOpacity={0.7} />
    <stop offset="100%" stopColor="#F9FAFB" stopOpacity={0.2} />
  </linearGradient>
</defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 카테고리 분포 */}
        <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg text-gray-800">카테고리 분포 (TOP 5)</h3>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={dashboardData.categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                dataKey="value"
              >
                {dashboardData.categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4">
            {dashboardData.categoryDistribution.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm text-gray-700">
                  {c.name} ({c.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Processing Queue & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 진행 큐 */}
        <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg text-gray-800">처리 대기/진행 큐</h3>
            <span className="text-sm text-gray-600">{dashboardData.processingQueue.length} active</span>
          </div>
          {dashboardData.processingQueue.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.processingQueue.slice(0, 4).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-700 truncate max-w-48">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{Math.round(item.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>현재 처리 중인 민원이 없습니다</p>
            </div>
          )}
        </div>

        {/* 최근 민원 */}
        <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg text-gray-800">최근 접수 민원</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 transition-colors">전체 보기</button>
          </div>
          <div className="space-y-4">
            {recentComplaints.map((c: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm">{(c.category || "민원").substring(0, 2)}</span>
                  </div>
                  <div>
                    <h4 className="text-gray-800 truncate max-w-48">{c.title || `민원 #${c.id}`}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(c.createdAt).toLocaleDateString()} · {c.channel?.toUpperCase() || "WEB"} ·{" "}
                      {c.priority ? `우선순위 ${c.priority}` : "일반"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {typeof c.satisfactionScore === "number" && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm ${getScoreColor(c.satisfactionScore)}`}>
                        {c.satisfactionScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(c.status)}`}>
                    {c.status === "received"
                      ? "접수"
                      : c.status === "in_progress"
                      ? "처리중"
                      : c.status === "resolved"
                      ? "완료"
                      : c.status === "rejected"
                      ? "반려"
                      : "기타"}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

     {/* Status & Satisfaction */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 상태 분포 */}
  <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
    <h3 className="text-lg text-gray-900 mb-6">처리 상태 분포</h3>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dashboardData.statusBreakdown}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} />
        <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
        <Bar dataKey="value" fill="url(#statusGray)" radius={8} />
        <defs>
          {/* 짙은회색 → 밝은회색 그라데이션 */}
          <linearGradient id="statusGray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* 만족도 분포 */}
  {dashboardData.satisfactionDistribution.some((d) => d.value > 0) && (
    <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
      <h3 className="text-lg text-gray-900 mb-6">만족도 분포</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dashboardData.satisfactionDistribution}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} />
          <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
          <Bar dataKey="value" fill="url(#scoreGray)" radius={8} />
          <defs>
            <linearGradient id="scoreGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="100%" stopColor="#E5E7EB" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>

{/* 접수 채널 분포 */}
<div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
  <h3 className="text-lg text-gray-900 mb-6">접수 채널 분포</h3>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={dashboardData.channelBreakdown}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} />
      <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
      <Bar dataKey="value" fill="url(#channelGray)" radius={8} />
      <defs>
        <linearGradient id="channelGray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#CED4DA" />
        </linearGradient>
      </defs>
    </BarChart>
  </ResponsiveContainer>
</div>
    </div>
  );
}
