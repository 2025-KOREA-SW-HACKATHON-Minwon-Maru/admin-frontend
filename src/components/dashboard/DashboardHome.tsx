// src/components/dashboard/CivilDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Tooltip, Legend
} from 'recharts';
import {
  Building, Users, Clock, CheckCircle, AlertCircle, FileText,
  Inbox, MessageSquare, Phone, Globe, Plus, MoreVertical, TrendingUp
} from 'lucide-react';
import { Fragment } from 'react';

interface CivilDashboardProps {
  regionName?: string; // 기본값: 금정구
}

type Priority = 'high' | 'medium' | 'low';

export function CivilDashboard({ regionName = '금정구' }: CivilDashboardProps) {
  // ----------------------------
  // 하드코딩 데이터 (Mock)
  // ----------------------------
  const kpi = {
    totalComplaints: 1287,       // 누적 접수
    monthNew: 214,               // 이번 달 신규
    resolvedRate: 0.86,          // 종결율
    avgFirstResponse: 8.2,       // 평균 최초응답(시간)
    inProgress: 97,              // 진행 중
    citizenSatisfaction: 4.3,    // 5점 만점
  };

  // 월별 접수 추이 (최근 12개월)
  const monthly = [
    { month: '01', complaints: 88,  resolved: 76 },
    { month: '02', complaints: 95,  resolved: 81 },
    { month: '03', complaints: 102, resolved: 90 },
    { month: '04', complaints: 110, resolved: 95 },
    { month: '05', complaints: 120, resolved: 105 },
    { month: '06', complaints: 135, resolved: 117 },
    { month: '07', complaints: 180, resolved: 154 },
    { month: '08', complaints: 214, resolved: 182 },
    { month: '09', complaints: 160, resolved: 138 },
    { month: '10', complaints: 150, resolved: 131 },
    { month: '11', complaints: 143, resolved: 124 },
    { month: '12', complaints: 190, resolved: 168 },
  ];

  // 유형 비율
  const byCategory = [
    { name: '도로/교통', value: 27 },
    { name: '청소/환경', value: 22 },
    { name: '소음/민원', value: 18 },
    { name: '안전/치안', value: 14 },
    { name: '복지/기타', value: 19 },
  ];

  // 접수 채널 분포
  const byChannel = [
    { name: '웹', value: 48 },
    { name: '모바일 앱', value: 32 },
    { name: '전화', value: 14 },
    { name: '방문', value: 6 },
  ];

  // 평균 처리 소요(일) 추이
  const resolutionTrend = [
    { week: 'W1', days: 3.1 }, { week: 'W2', days: 2.9 },
    { week: 'W3', days: 3.7 }, { week: 'W4', days: 3.0 },
    { week: 'W5', days: 2.8 }, { week: 'W6', days: 2.6 },
  ];

  // 최근 접수 리스트
  const recent = [
    { id: 'C-240815-0012', title: '○○로 보도블록 파손', type: '도로/교통', channel: '모바일 앱', time: '2시간 전', status: '접수' },
    { id: 'C-240815-0013', title: '주거지 인근 불법 투기', type: '청소/환경', channel: '웹', time: '3시간 전', status: '처리중' },
    { id: 'C-240815-0014', title: '심야시간대 공사 소음', type: '소음/민원', channel: '전화', time: '5시간 전', status: '처리중' },
    { id: 'C-240815-0015', title: '어린이공원 안전 점검 요청', type: '안전/치안', channel: '모바일 앱', time: '어제', status: '완료' },
  ];

  // 조치 필요(에스컬레이션 후보)
  const pending: Array<{ task: string; priority: Priority; dueDate: string; }> = [
    { task: '48시간 경과 미응답 7건 1차 알림', priority: 'high',   dueDate: '2025-08-30' },
    { task: '반복 민원(동일 주소 3회 이상) 패턴 점검', priority: 'medium', dueDate: '2025-09-01' },
    { task: '민원 유형 라우팅 규칙 업데이트', priority: 'low',    dueDate: '2025-09-03' },
  ];

  // 파일/문서 통계(예시)
  const docStats = {
    totalDocs: 342,
    photos: 128,
    pdfs: 142,
    voice: 36,
    attachments: 516,
  };

  const priorityVariant = (p: Priority) =>
    p === 'high' ? 'destructive' : p === 'medium' ? 'secondary' : 'outline';

  const pieColors = ['#6366F1', '#22C55E', '#F97316', '#06B6D4', '#F43F5E'];
  const pieColors2 = ['#8B5CF6', '#14B8A6', '#F59E0B', '#60A5FA'];

  // ----------------------------
  // 렌더링
  // ----------------------------
  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {regionName} 민원 대시보드
          </h1>
          <p className="text-gray-600 mt-1">
            접수·처리 현황과 채널/유형 분석, 응답 성과를 한눈에
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> 보고서 내보내기
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> 새 민원 등록
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">누적 접수</p>
              <p className="text-2xl font-semibold">{kpi.totalComplaints.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Inbox className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 달 신규</p>
              <p className="text-2xl font-semibold">{kpi.monthNew}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">종결율</p>
              <p className="text-2xl font-semibold">{Math.round(kpi.resolvedRate * 100)}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">진행 중</p>
              <p className="text-2xl font-semibold">{kpi.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 최초응답</p>
              <p className="text-2xl font-semibold">{kpi.avgFirstResponse}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">만족도(5점)</p>
              <p className="text-2xl font-semibold">{kpi.citizenSatisfaction}</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* 상단 그리드: 월별 추이 & 빠른 작업 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 접수/종결 추이 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>월별 접수 추이</CardTitle>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600">최근 12개월 접수 대비 종결</p>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="complaints" name="접수" stroke="#8B5CF6" fill="#C4B5FD" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved"   name="종결" stroke="#10B981" fill="#A7F3D0" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 빠른 작업 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              빠른 작업
            </CardTitle>
            <p className="text-sm text-gray-600">자주 수행하는 업무를 빠르게 실행</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2">
              <MessageSquare className="w-4 h-4" />
              새로운 민원 등록
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <AlertCircle className="w-4 h-4" />
              48시간 경과 건 확인
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="w-4 h-4" />
              주간 보고서 생성
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Phone className="w-4 h-4" />
              콜백 필요 건 목록
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Globe className="w-4 h-4" />
              채널 라우팅 규칙 편집
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 중간 그리드: 유형/채널/처리속도 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 유형 비율 */}
        <Card>
          <CardHeader>
            <CardTitle>민원 유형 비율</CardTitle>
            <p className="text-sm text-gray-600">지난 30일 기준</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                    {byCategory.map((_, i) => (<Cell key={i} fill={pieColors[i % pieColors.length]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 채널 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>접수 채널</CardTitle>
            <p className="text-sm text-gray-600">웹·앱·전화·방문</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="비율(%)">
                    {byChannel.map((_, i) => (<Cell key={i} fill={pieColors2[i % pieColors2.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 평균 처리 소요 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>평균 처리 소요(일)</CardTitle>
            <p className="text-sm text-gray-600">최근 6주 추이</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={resolutionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="days" name="일" stroke="#F97316" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 하단: 최근 접수 & 조치 필요 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 접수 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              최근 접수
            </CardTitle>
            <p className="text-sm text-gray-600">실시간 처리 현황</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-1">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{c.id}</span><span>•</span>
                    <span>{c.type}</span><span>•</span>
                    <span>{c.channel}</span><span>•</span>
                    <span>{c.time}</span>
                  </div>
                </div>
                <Badge variant={c.status === '완료' ? 'outline' : 'secondary'} className="text-xs">
                  {c.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 조치 필요 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              조치 필요
            </CardTitle>
            <p className="text-sm text-gray-600">우선순위 기반 에스컬레이션 후보</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((t, i) => (
              <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.task}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    마감: {new Date(t.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={priorityVariant(t.priority)} className="text-xs capitalize">
                  {t.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 문서/첨부 개요 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            첨부/문서 개요
          </CardTitle>
          <p className="text-sm text-gray-600">민원 처리에 첨부된 자료 현황</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatTile label="총 문서" value={docStats.totalDocs} />
            <StatTile label="사진" value={docStats.photos} />
            <StatTile label="PDF" value={docStats.pdfs} />
            <StatTile label="음성 기록" value={docStats.voice} />
            <StatTile label="총 첨부파일" value={docStats.attachments} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
        <FileText className="w-6 h-6 text-gray-700" />
      </div>
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}
