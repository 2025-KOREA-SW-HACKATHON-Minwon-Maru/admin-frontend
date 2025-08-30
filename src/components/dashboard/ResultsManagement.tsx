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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = 'http://localhost:5001';
const DUMMY_URL = '/complaints/dummy.json'; // ✅ public/complaints/dummy.json

export type HistoryMessage = {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type ChatHistoryResponse = {
  success: boolean;
  chatId: string;
  history: HistoryMessage[];
  departments?: Array<{ id?: string; name?: string; phone?: string; [k: string]: any }>;
  message?: string;
};

export type ComplaintItem = {
  id: string;
  title: string;
  summary: string;
  departmentId: string;
  status: '접수' | '처리중' | '완료' | '보류';
  createdAt: string;
  updatedAt: string;
};

type Department = { id: string; name: string; desc: string; phone?: string; tags?: string[] };
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

const statusOptions = ['전체', '접수', '처리중', '완료', '보류'] as const;

const fmt = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR', { hour12: false });
};
const ellip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

type DummyDetail = { history: HistoryMessage[]; departments: Array<{ id?: string; name?: string; phone?: string; [k: string]: any }> };

type DummyFile = {
  sessions: Array<
    ChatHistoryResponse & {
      meta?: {
        status?: ComplaintItem['status'];
        departmentId?: string;
        createdAt?: string;
        updatedAt?: string;
        title?: string;
        summary?: string;
      };
    }
  >;
};

export function ComplaintsInbox() {
  const [dept, setDept] = useState<string>('');
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('전체');
  const [q, setQ] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ComplaintItem[]>([]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [relevantDepts, setRelevantDepts] = useState<ChatHistoryResponse['departments']>([]);

  const dummyDetailsRef = useRef<Record<string, DummyDetail>>({});

  const handleResolve = (id: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, status: '완료', updatedAt: new Date().toISOString() } : it))
    );
  };

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, []);

  // ✅ 초기 로드: 1) 더미 JSON → 목록/상세 구성  2) API 1건 합치기
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) 더미 JSON 가져오기
        const dummyRes = await fetch(DUMMY_URL, { signal: controller.signal });
        if (!dummyRes.ok) throw new Error(`더미 JSON 로드 실패: HTTP ${dummyRes.status}`);
        const dummy: DummyFile = await dummyRes.json();

        // 더미 → 목록(items) & 상세(dummyDetailsRef)
        const dummyItems: ComplaintItem[] = [];
        const dummyDetails: Record<string, DummyDetail> = {};

        for (const s of dummy.sessions || []) {
          const firstMsg = s.history?.[0];
          const lastMsg = s.history?.[s.history.length - 1];

          // meta 없으면 history/department로 대체
          const departmentId =
            s.meta?.departmentId ||
            (Array.isArray(s.departments) && s.departments.length > 0 ? String(s.departments[0].id || '') : '');

          const title =
            s.meta?.title ||
            (firstMsg?.type === 'user' && firstMsg.content
              ? ellip(firstMsg.content.replace(/\s+/g, ' '), 50)
              : '사용자 질문');

          const summary =
            s.meta?.summary ||
            (() => {
              const firstAssistant = s.history?.find(m => m.type === 'assistant');
              const base = firstAssistant?.content || firstMsg?.content || '';
              return ellip(String(base).replace(/\s+/g, ' '), 90);
            })();

          const createdAt = s.meta?.createdAt || firstMsg?.timestamp || new Date().toISOString();
          const updatedAt = s.meta?.updatedAt || lastMsg?.timestamp || createdAt;
          const status: ComplaintItem['status'] = s.meta?.status || '접수';

          dummyItems.push({
            id: s.chatId,
            title,
            summary,
            departmentId,
            status,
            createdAt,
            updatedAt,
          });

          dummyDetails[s.chatId] = {
            history: s.history || [],
            departments: s.departments || [],
          };
        }

        // 최신순 정렬(업데이트 기준)
        dummyItems.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
        dummyDetailsRef.current = dummyDetails;

        // 2) API 항목 1건 시도 (실패해도 무시)
        let apiRow: ComplaintItem | null = null;
        try {
          const res = await fetch(`${API_BASE}/api/chat/history`, { signal: controller.signal });
          if (res.ok) {
            const data: ChatHistoryResponse = await res.json();
            if (data?.success === false) throw new Error(data.message || '히스토리 로드 실패');

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
          }
        } catch {
          // ignore
        }

        // 3) 목록 합치기: API가 있으면 맨 위
        setItems(apiRow ? [apiRow, ...dummyItems] : dummyItems);
      } catch (e: any) {
        setError(e?.message || '로딩 실패');
        setItems([]); // 실패 시 비우되, 필요하면 fallback 더미 생성 로직 추가 가능
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  // ✅ 상세 모달 로딩: 더미면 JSON에서, API면 서버에서
  useEffect(() => {
    if (!openId) {
      setHistory([]);
      setRelevantDepts([]);
      setHistoryError(null);
      return;
    }

    const dummyDetail = dummyDetailsRef.current[openId];
    if (dummyDetail) {
      setHistoryLoading(true);
      // 살짝 로딩 연출
      setTimeout(() => {
        setHistory(dummyDetail.history ?? []);
        setRelevantDepts(dummyDetail.departments ?? []);
        setHistoryError(null);
        setHistoryLoading(false);
      }, 120);
      return;
    }

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
      list = list.filter(i => i.title.includes(qq) || i.summary.includes(qq) || i.id.includes(qq));
    }
    return list;
  }, [items, dept, status, q]);

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
          <p className="text-gray-600 mt-1">API 1건 + JSON 더미 세션들을 함께 표시합니다.</p>
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
                <div className="text-xs text-gray-500">최근 업데이트: {fmt(selected.updatedAt)}</div>
              </div>

              {/* 연관 부서 */}
              {relevantDepts && relevantDepts.length > 0 && (
                <div className="px-6 pb-2">
                  <div className="text-sm font-medium mb-2">연관 부서(Top 3)</div>
                  <div className="flex flex-wrap gap-2">
                    {relevantDepts.slice(0, 3).map((d, i) => (
                      <Badge key={i} variant="outline">{d.name || d.id || '부서'}</Badge>
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
                              <ReactMarkdown>
                                {typeof m.content === "string" ? m.content : String(m.content ?? "")}
                              </ReactMarkdown>

                              <div className="mt-1 text-[10px] text-gray-500">{fmt(m.timestamp)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </div>
              </div>

              {/* 상태 & 액션 */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">현재 상태</span>
                  {statusBadge(selected.status)}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleResolve(selected.id)} disabled={selected.status === '완료'}>
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
