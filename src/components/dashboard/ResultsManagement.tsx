// src/components/complaints/ComplaintsInbox.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Loader2, Filter, Eye, AlertCircle, CheckCircle2, Building2, FileText } from 'lucide-react';

// ==============================
// Config
// ==============================
const API_BASE = 'http://localhost:5001';

// ==============================
// Types
// ==============================
export type HistoryMessage = {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
};

export type ChatHistoryResponse = {
  success: boolean;
  chatId: string;
  history: HistoryMessage[];
  departments?: Array<{
    id?: string;
    name?: string;
    phone?: string;
    [k: string]: any;
  }>;
  message?: string;
};

export type ComplaintItem = {
  id: string;                 // chatId or dummy id
  title: string;              // 첫 사용자 메시지
  summary: string;            // 첫 어시스턴트 답변 요약
  departmentId: string;       // departments[0]?.id
  status: '접수' | '처리중' | '완료' | '보류';
  createdAt: string;          // 첫 메시지 시간
  updatedAt: string;          // 마지막 메시지 시간
};

// ==============================
// Local meta (departments)
// ==============================
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

// ==============================
// Utils
// ==============================
const statusOptions = ['전체', '접수', '처리중', '완료', '보류'] as const;

const fmt = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR', { hour12: false });
};
const ellip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

// 랜덤 유틸
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ==============================
// Dummy generator
// ==============================
type DummyDetail = {
  history: HistoryMessage[];
  departments: Array<{ id?: string; name?: string; phone?: string; [k: string]: any }>;
};

function makeDummyThread(idNum: number): { item: ComplaintItem; detail: DummyDetail } {
  const dept = pick(departments);
  const st: ComplaintItem['status'][] = ['접수', '처리중', '완료', '보류'];
  const status = pick(st);
  const now = Date.now();
  const createdAt = new Date(now - randomInt(1, 28) * 24 * 60 * 60 * 1000 - randomInt(0, 23) * 3600 * 1000);
  const updatedAt = new Date(createdAt.getTime() + randomInt(1, 72) * 3600 * 1000);

  const subjects = [
    '도로 파손 신고', '불법 주정차 신고', '생활폐기물 수거 지연', '건축 소음 민원',
    '어린이공원 안전시설 점검 요청', '세금 고지서 문의', '체납 안내 정정 요청',
    '축제 안내 및 교통 통제 문의', '체육시설 예약 불가', '학교 주변 불법 광고물',
    '보건소 예방접종 예약 오류', '지적 정정 신청 관련', '공원 수목 전지 요청',
  ];
  const place = ['○○로', '△△길', '역삼동', '가양동', '광진구', '천호대로', '시청 인근'];
  const title = `${pick(subjects)} - ${pick(place)} ${randomInt(1, 99)}길`;
  const summary = `담당 부서(${dept.name}) 안내 및 처리 절차를 설명했습니다. 접수 상태: ${status}`;

  const item: ComplaintItem = {
    id: `DUMMY-${idNum}`,
    title: ellip(title, 50),
    summary: ellip(summary, 90),
    departmentId: dept.id,
    status,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };

  // 더미 히스토리(3~7 turn)
  const turns = randomInt(3, 7);
  const history: HistoryMessage[] = [];
  let t = createdAt.getTime();
  for (let i = 0; i < turns; i++) {
    const isUser = i % 2 === 0;
    const content = isUser
      ? [
          `안녕하세요. ${title} 관련해서 문의드립니다.`,
          `현장 위치는 ${pick(place)} 근처입니다.`,
          `사진도 첨부했는데 확인 부탁드려요.`,
          `긴급한 사항은 아니지만 빠른 처리 바랍니다.`,
        ][i % 4]
      : [
          `접수되었습니다. 담당 부서(${dept.name})에서 확인 중입니다.`,
          `현장 확인 후 추가 조치가 필요하면 연락드리겠습니다.`,
          `처리 예상 소요는 3~5일입니다.`,
          `보완 자료(사진 원본)가 있으시면 업로드 부탁드립니다.`,
        ][i % 4];
    t += randomInt(10, 180) * 60 * 1000;
    history.push({
      type: isUser ? 'user' : 'assistant',
      content,
      timestamp: new Date(t).toISOString(),
    });
  }

  // 연관 부서 Top3 (랜덤 1~3개)
  const relatedCount = randomInt(1, 3);
  const shuffled = [...departments].sort(() => Math.random() - 0.5);
  const departmentsTop = [dept, ...shuffled.filter(d => d.id !== dept.id)].slice(0, relatedCount);

  const detail: DummyDetail = {
    history,
    departments: departmentsTop.map(d => ({ id: d.id, name: d.name, phone: d.phone })),
  };

  return { item, detail };
}

function makeManyDummy(count = 60) {
  const items: ComplaintItem[] = [];
  const details: Record<string, DummyDetail> = {};
  for (let i = 1; i <= count; i++) {
    const { item, detail } = makeDummyThread(i);
    items.push(item);
    details[item.id] = detail;
  }
  // 최신 순으로 정렬(업데이트 기준)
  items.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  return { items, details };
}

// ==============================
// Component
// ==============================
export function ComplaintsInbox() {
  // 필터 (UI만 유지)
  const [dept, setDept] = useState<string>(''); // 부서 id
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('전체');
  const [q, setQ] = useState<string>('');

  // 목록
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ComplaintItem[]>([]);

  // 상세 모달 상태
  const [openId, setOpenId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [relevantDepts, setRelevantDepts] = useState<ChatHistoryResponse['departments']>([]);

  // 더미 상세 저장소 (id -> detail)
  const dummyDetailsRef = useRef<Record<string, DummyDetail>>({});

  const handleResolve = (id: string) => {
    setItems(prev =>
      prev.map(it =>
        it.id === id ? { ...it, status: '완료', updatedAt: new Date().toISOString() } : it
      )
    );
  };

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, []);

  // 초기 로드: API 1건 + 더미 N건
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) 더미 먼저 생성해두고
        const { items: dummyItems, details: dummyDetails } = makeManyDummy(60);
        dummyDetailsRef.current = dummyDetails;

        // 2) API 항목 로드
        let apiRow: ComplaintItem | null = null;
        try {
          const res = await fetch(`${API_BASE}/api/chat/history`, { signal: controller.signal });
          if (res.ok) {
            const data: ChatHistoryResponse = await res.json();
            if (data.success === false) throw new Error(data.message || '히스토리 로드 실패');

            const msgs = Array.isArray(data.history) ? data.history : [];
            const firstMsg = msgs[0];
            const lastMsg = msgs[msgs.length - 1];
            const firstUser = msgs.find(m => m.type === 'user');
            const firstAssistant = msgs.find(m => m.type === 'assistant');

            const depId = (data.departments?.[0]?.id as string) || '';
            apiRow = {
              id: data.chatId,
              title: firstUser?.content ? ellip(firstUser.content.replace(/\s+/g, ' '), 50) : '사용자 질문',
              summary: firstAssistant?.content
                ? ellip(firstAssistant.content.replace(/\s+/g, ' '), 90)
                : (firstMsg?.content ? ellip(firstMsg.content.replace(/\s+/g, ' '), 90) : ''),
              departmentId: depId,
              status: '접수',
              createdAt: firstMsg?.timestamp || new Date().toISOString(),
              updatedAt: lastMsg?.timestamp || new Date().toISOString(),
            };

            // API 상세는 서버에서 불러오므로 더미 상세에는 추가하지 않음
          }
        } catch (e) {
          // API 실패해도 더미만으로 진행
        }

        // 3) 목록 구성: API가 있으면 가장 위에, 그 아래 더미들
        setItems(apiRow ? [apiRow, ...dummyItems] : dummyItems);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message ?? 'Failed to load');
        // 더미는 이미 생성됨 → 목록만 더미로 대체
        const { items: dummyItems } = makeManyDummy(60);
        setItems(dummyItems);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  // 상세 모달: openId 바뀔 때 히스토리 로드
  useEffect(() => {
    if (!openId) {
      setHistory([]);
      setRelevantDepts([]);
      setHistoryError(null);
      return;
    }

    // 더미인지부터 확인
    const dummyDetail = dummyDetailsRef.current[openId];
    if (dummyDetail) {
      // 더미면 API 호출 없이 로컬 상세 사용
      setHistoryLoading(true);
      setTimeout(() => {
        setHistory(dummyDetail.history ?? []);
        setRelevantDepts(dummyDetail.departments ?? []);
        setHistoryError(null);
        setHistoryLoading(false);
      }, 150); // 살짝 로딩 연출
      return;
    }

    // API 항목이면 서버에서 로드
    const controller = new AbortController();
    async function loadHistory(chatId: string) {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        let res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(chatId)}/history`, { signal: controller.signal });
        if (!res.ok) {
          res = await fetch(`${API_BASE}/api/chat/history?chatId=${encodeURIComponent(chatId)}`, { signal: controller.signal });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ChatHistoryResponse = await res.json();
        if (data.success === false) throw new Error(data.message || '히스토리 로드 실패');

        setHistory(data.history ?? []);
        setRelevantDepts(data.departments ?? []);
      } catch (e: any) {
        setHistory([]);
        setRelevantDepts([]);
        if (e.name !== 'AbortError') setHistoryError(e.message ?? '히스토리 로드 실패');
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory(openId);
    return () => controller.abort();
  }, [openId]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (dept) list = list.filter(i => i.departmentId === dept);
    if (status !== '전체') list = list.filter(i => i.status === status);
    if (q.trim()) {
      const qq = q.trim();
      list = list.filter(i =>
        i.title.includes(qq) || i.summary.includes(qq) || i.id.includes(qq)
      );
    }
    return list;
  }, [items, dept, status, q]);

  const selected = useMemo(
    () => items.find(i => i.id === openId) || null,
    [items, openId]
  );

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
          <p className="text-gray-600 mt-1">API 결과 1건 + 더미 항목 다수로 리스트를 구성합니다.</p>
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
          <div className="md:col-span-2">
            <Label>키워드</Label>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="제목/요약/ID 검색" />
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
          ) : filteredItems.length === 0 ? (
            <div className="text-sm text-gray-500">조건에 맞는 항목이 없습니다.</div>
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
                {filteredItems.map(row => {
                  const d = deptMap.get(row.departmentId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{row.summary}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{d?.name ?? (row.departmentId || '부서 미지정')}</span>
                          {d?.desc && <span className="text-xs text-gray-500 line-clamp-1">{d.desc}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-sm">{fmt(row.createdAt)}</TableCell>
                      <TableCell className="text-sm">{fmt(row.updatedAt)}</TableCell>
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
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden">
          {openId && selected && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3 border-b">
                <DialogTitle className="text-lg">{selected.title}</DialogTitle>
                <DialogDescription>
                  민원 ID {openId}{selected.createdAt ? ` · ${fmt(selected.createdAt)}` : ''}
                </DialogDescription>
              </DialogHeader>

              {/* 메타 */}
              <div className="px-6 py-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{(departments.find(d => d.id === selected.departmentId)?.name) ?? selected.departmentId}</span>
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
                  최근 업데이트: {fmt(selected.updatedAt)}
                </div>
              </div>

              {/* 연관 부서 */}
              {relevantDepts && relevantDepts.length > 0 && (
                <div className="px-6 pb-2">
                  <div className="text-sm font-medium mb-2">연관 부서(Top 3)</div>
                  <div className="flex flex-wrap gap-2">
                    {relevantDepts.slice(0, 3).map((d, i) => (
                      <Badge key={i} variant="outline">
                        {d.name || d.id || '부서'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                              title={fmt(m.timestamp)}
                            >
                              <div className="whitespace-pre-wrap">{m.content}</div>
                              <div className="mt-1 text-[10px] text-gray-500">{fmt(m.timestamp)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </div>
              </div>

              {/* 상태 & 액션 버튼 */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">현재 상태</span>
                  {statusBadge(selected.status)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleResolve(selected.id)}
                    disabled={selected.status === '완료'}
                  >
                    {selected.status === '완료' ? '해결됨' : '해결로 변경'}
                  </Button>
                  <Button onClick={() => setOpenId(null)}>닫기</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
