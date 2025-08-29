// src/components/complaints/ComplaintsInbox.tsx
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import {
  Filter, Eye, AlertCircle, CheckCircle2, Loader2,
  Building2, FileText
} from 'lucide-react';

const API_BASE = 'http://localhost:5001';
const USE_MOCK = false; // ← 실제 API 사용

// 시간 헬퍼
const isoHoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

// ---- 타입 정의 ----
export type HistoryMessage = {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
};

export type ComplaintItem = {
  id: string;
  title: string;
  summary: string;
  departmentId: string;
  status: '접수' | '처리중' | '완료' | '보류';
  createdAt: string; // ISO
  updatedAt: string; // ISO
  history: HistoryMessage[];
};

// ---- 부서 메타 ----
type Department = {
  id: string; name: string; desc: string;
  phone?: string; tags?: string[];
};
const departments: Department[] = [
  { id: 'a', name: '기획예산과', desc: '구정 기획·성과관리, 예산 편성·조정' },
  { id: 'b', name: '감사법무과', desc: '감사·청렴, 소송·법률 자문, 규정 정비' },
  { id: 'c', name: '행정지원과', desc: '인사·조직·교육, 문서·회의·청사 관리' },
  { id: 'd', name: '민원봉사과', desc: '제증명 발급·민원 접수 총괄' },
  { id: 'e', name: '재무과', desc: '회계, 계약, 재산·물품 관리' },
  { id: 'f', name: '세무1과', desc: '지방세 부과·징수 및 체납관리' },
  { id: 'g', name: '세무2과', desc: '취득세·등록면허세 등 세원관리' },
  { id: 'h', name: '문화관광과', desc: '문화·관광 정책, 축제·행사' },
  { id: 'i', name: '교육체육과', desc: '교육 지원, 학교·체육시설' },
  { id: 'j', name: '복지정책과', desc: '복지 종합계획·전달체계' },
  { id: 'k', name: '아동청소년과', desc: '보육, 아동·청소년' },
  { id: 'l', name: '주민복지과', desc: '복지급여·사례관리' },
  { id: 'm', name: '생활보장과', desc: '생계·의료·주거·교육급여' },
  { id: 'n', name: '노인장애인복지과', desc: '노인·장애인 복지' },
  { id: 'o', name: '일자리경제과', desc: '일자리·창업·소상공인' },
  { id: 'p', name: '경제산업과', desc: '지역산업·기업지원·전통시장' },
  { id: 'q', name: '환경위생과', desc: '생활환경·식품/공중위생' },
  { id: 'r', name: '자원순환과', desc: '폐기물·재활용·수거' },
  { id: 's', name: '공원녹지과', desc: '공원·녹지·도시숲' },
  { id: 't', name: '토지정보과', desc: '지적·공시지가·측량' },
  { id: 'u', name: '안전총괄과', desc: '재난·민방위·안전' },
  { id: 'v', name: '교통행정과', desc: '대중교통·주차·단속' },
  { id: 'w', name: '도시관리과', desc: '도시계획·정비·공공시설' },
  { id: 'x', name: '건설과', desc: '도로·하천 공사·유지' },
  { id: 'y', name: '건축허가과', desc: '건축 인허가·불법건축물' },
  { id: 'z', name: '보건행정과', desc: '보건소 행정·감염병' },
];

// ---- 목 데이터 ----
const MOCK_ITEMS: ComplaintItem[] = [
  {
    id: 'C-20250829-0012',
    title: '보도블록 파손 신고',
    summary: '○○로 구간 보도블록 파손으로 보행 불편',
    departmentId: 'x',
    status: '처리중',
    createdAt: isoHoursAgo(26),
    updatedAt: isoHoursAgo(2),
    history: [
      { type: 'user',      content: '우리 동네 ○○로 보도블록이 깨져 있어요. 유모차가 지나가기 어려워요.', timestamp: isoHoursAgo(26) },
      { type: 'assistant', content: '접수되었습니다. 건설과에 이관하여 조치 예정입니다.', timestamp: isoHoursAgo(25.8) },
      { type: 'assistant', content: '현장 확인 중입니다. 임시 통행 유도 배너 설치하겠습니다.', timestamp: isoHoursAgo(3.5)  },
    ],
  },
  {
    id: 'C-20250828-0003',
    title: '악취 민원',
    summary: '△△시장 인근에서 야간 악취 발생',
    departmentId: 'q',
    status: '접수',
    createdAt: isoHoursAgo(40),
    updatedAt: isoHoursAgo(39.5),
    history: [
      { type: 'user',      content: '△△시장 근처 밤마다 악취가 나요. 확인 부탁드립니다.', timestamp: isoHoursAgo(40) },
      { type: 'assistant', content: '접수되었습니다. 환경위생과에서 야간 순찰을 진행하겠습니다.', timestamp: isoHoursAgo(39.5) },
    ],
  },
  {
    id: 'C-20250827-0041',
    title: '불법주정차 단속 요청',
    summary: '학교 앞 횡단보도 상습 주정차',
    departmentId: 'v',
    status: '완료',
    createdAt: isoHoursAgo(72),
    updatedAt: isoHoursAgo(10),
    history: [
      { type: 'user',      content: '아침마다 학교 앞에 차가 서 있어 아이들이 위험합니다.', timestamp: isoHoursAgo(72) },
      { type: 'assistant', content: '즉시 단속반 배치 후 계도 및 단속 진행하겠습니다.', timestamp: isoHoursAgo(71.8) },
      { type: 'assistant', content: '계도장 5건, 과태료 2건 처리 완료했습니다.', timestamp: isoHoursAgo(10)   },
    ],
  },
  {
    id: 'C-20250826-0022',
    title: '불법건축물 의심 신고',
    summary: '주택 옥상 무단 증축 추정',
    departmentId: 'y',
    status: '보류',
    createdAt: isoHoursAgo(90),
    updatedAt: isoHoursAgo(12),
    history: [
      { type: 'user',      content: '옆집이 옥상에 구조물을 올렸는데 허가 여부가 궁금합니다.', timestamp: isoHoursAgo(90) },
      { type: 'assistant', content: '현장 조사 필요로 보류 상태입니다. 일정 확정 후 안내드리겠습니다.', timestamp: isoHoursAgo(12) },
    ],
  },
  {
    id: 'C-20250829-0030',
    title: '주민참여예산 문의',
    summary: '접수 기간과 제출 서식 안내 요청',
    departmentId: 'a',
    status: '접수',
    createdAt: isoHoursAgo(8),
    updatedAt: isoHoursAgo(7.8),
    history: [
      { type: 'user',      content: '주민참여예산 제안 접수 기간이 언제인가요?', timestamp: isoHoursAgo(8) },
      { type: 'assistant', content: '올해 접수는 9/15~10/5입니다. 서식은 홈페이지에서 내려받을 수 있어요.', timestamp: isoHoursAgo(7.8) },
    ],
  },
  {
    id: 'C-20250829-0044',
    title: '독감 예방접종 일정',
    summary: '어르신 무료 접종 가능 시기 문의',
    departmentId: 'z',
    status: '처리중',
    createdAt: isoHoursAgo(4),
    updatedAt: isoHoursAgo(1.5),
    history: [
      { type: 'user',      content: '만 65세 독감 접종 일정과 장소가 궁금합니다.', timestamp: isoHoursAgo(4) },
      { type: 'assistant', content: '10월 2주차부터 시작하며 보건소 및 지정 의료기관에서 가능해요.', timestamp: isoHoursAgo(3.8) },
      { type: 'assistant', content: '지정 의료기관 목록을 링크로 보내드렸습니다.', timestamp: isoHoursAgo(1.5) },
    ],
  },
];

// 클라 필터 (q 빠진 타입 버그 수정)
function filterMock(
  items: ComplaintItem[],
  params: { dept?: string; status?: ComplaintItem['status'] | '전체'; q?: string }
) {
  return items.filter(it => {
    if (params.dept && it.departmentId !== params.dept) return false;
    if (params.status && params.status !== '전체' && it.status !== params.status) return false;
    if (params.q && params.q.trim()) {
      const k = params.q.trim().toLowerCase();
      const hay = `${it.title} ${it.summary}`.toLowerCase();
      if (!hay.includes(k)) return false;
    }
    return true;
  });
}

// 상태/채널 선택지
const statusOptions = ['전체', '접수', '처리중', '완료', '보류'] as const;

export function ComplaintsInbox() {
  // 필터 상태
  const [dept, setDept] = useState<string>(''); // 부서 id
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('전체');
  const [q, setQ] = useState<string>('');

  // 데이터 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ComplaintItem[]>([]);

  // 상세 모달
  const [openId, setOpenId] = useState<string | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryMessage[]>([]);


  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, []);

  // API/목 데이터 로드
  // useEffect(() => {
  //   const controller = new AbortController();
  //   async function load() {
  //     try {
  //       setLoading(true);
  //       setError(null);

  //       if (USE_MOCK) {
  //         await new Promise(r => setTimeout(r, 400));
  //         setItems(filterMock(MOCK_ITEMS, { dept, status, q }));
  //         return;
  //       }

  //       const params = new URLSearchParams();
  //       if (dept) params.set('departmentId', dept);
  //       if (status !== '전체') params.set('status', status);
  //       if (q.trim()) params.set('q', q.trim());

  //       const res = await fetch(`/api/complaints?${params.toString()}`, { signal: controller.signal });
  //       if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //       const data = (await res.json()) as ComplaintItem[];
  //       setItems(data);
  //     } catch (e: any) {
  //       if (e.name !== 'AbortError') setError(e.message ?? 'Failed to load');
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   load();
  //   return () => controller.abort();
  // }, [dept, status, q]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (dept) params.set('departmentId', dept);
        if (status !== '전체') params.set('status', status);
        if (q.trim()) params.set('q', q.trim());

        const res = await fetch(`${API_BASE}/api/complaints?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ComplaintItem[];
        setItems(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [dept, status, q]);

  useEffect(() => {
    if (!openId) { setHistory([]); setHistoryError(null); return; }
    const controller = new AbortController();
    async function loadHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const res = await fetch(`${API_BASE}/api/chat/${openId}/history`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHistory(data.history ?? []);
      } catch (e: any) {
        if (e.name !== 'AbortError') setHistoryError(e.message ?? '히스토리 로드 실패');
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
    return () => controller.abort();
  }, [openId]);


  const selected = useMemo(() => items.find(i => i.id === openId) || null, [items, openId]);

  const statusBadge = (s: ComplaintItem['status']) => {
    switch (s) {
      case '완료': return <Badge variant="default">완료</Badge>;
      case '처리중': return <Badge variant="secondary">처리중</Badge>;
      case '보류': return <Badge variant="outline">보류</Badge>;
      default: return <Badge variant="outline">접수</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">민원 접수함</h1>
          <p className="text-gray-600 mt-1">부서별 민원 리스트와 대화 히스토리를 조회합니다.</p>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> 필터
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>부서</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>상태</Label>
            <Select value={status} onValueChange={v => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>키워드</Label>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="제목/내용 검색" />
          </div>
        </CardContent>
      </Card>

      {/* 리스트 */}
      <Card>
        <CardHeader><CardTitle>민원 목록</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>불러오기 실패: {error}</AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-500">조건에 맞는 민원이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목/요약</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>접수일</TableHead>
                  <TableHead>업데이트</TableHead>
                  <TableHead>보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(row => {
                  const d = deptMap.get(row.departmentId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{row.summary}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{d?.name ?? row.departmentId}</span>
                          {d?.desc && <span className="text-xs text-gray-500 line-clamp-1">{d.desc}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-sm">{new Date(row.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{new Date(row.updatedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setOpenId(row.id)}>
                          <Eye className="w-4 h-4" /> 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 상세 모달 */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3 border-b">
                <DialogTitle className="text-lg">
                  {selected.title}
                </DialogTitle>
                <DialogDescription>
                  민원 ID {selected.id} · {new Date(selected.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {/* 메타 */}
              <div className="px-6 py-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{deptMap.get(selected.departmentId)?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="truncate" title={selected.summary}>{selected.summary}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === '완료' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{selected.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  최근 업데이트: {new Date(selected.updatedAt).toLocaleString()}
                </div>
              </div>

              {/* 히스토리 */}
              <div className="px-6 pb-2 font-medium">대화 히스토리</div>
              <div className="px-6 pb-6">
                <div className="border rounded-lg h-[48vh] overflow-hidden">
                  {historyLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm">불러오는 중…</div>
                  ) : historyError ? (
                    <div className="h-full flex items-center justify-center text-red-600 text-sm">{historyError}</div>
                  ) : (
                    <ScrollArea className="h-full p-4">
                      <ul className="space-y-3">
                        {history.map((m, i) => (
                          <li key={i} className={`flex ${m.type === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow
                              ${m.type === 'user' ? 'bg-gray-100' : 'bg-indigo-50'}`}
                              title={new Date(m.timestamp).toLocaleString()}
                            >
                              <div className="whitespace-pre-wrap">{m.content}</div>
                              <div className="mt-1 text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleString()}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 pb-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: 추후 “사용자 원문 입력” 상세 API 호출 연결
                    alert('원문 입력 보기: 추후 API 연동 예정');
                  }}
                >
                  원문 입력 보기
                </Button>
                <Button onClick={() => setOpenId(null)}>닫기</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
