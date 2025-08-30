// Civil API Service - TypeScript Implementation (민원 도메인 전환)
// 기존 대시보드 호환을 위해 export 명은 atsApi 로 유지합니다.

type Channel = 'web' | 'mobile' | 'phone' | 'offline';
type ComplaintStatus = 'received' | 'in_review' | 'in_progress' | 'resolved' | 'rejected';

interface ReporterInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

// 대시보드 호환용 DTO 타입(선택)
type ComplaintDTO = {
  id: string | number;
  title: string;
  category: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channel?: Channel | string;
  createdAt: string;
  updatedAt?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  status: string;
  satisfactionScore?: number; // 1~5점 스케일
};

interface SectionScore {
  name: string;     // 예: '접수 정확도', '분류 적합도', 'SLA 준수'
  score: number;    // 0~100
  status: 'excellent' | 'good' | 'average' | 'poor';
  found: boolean;   // 해당 섹션 데이터 유무
}

// 차트 재사용을 위해 Skill 형태를 '민원 태그/키워드'로 사용
interface TagSkill {
  name: string;           // 예: '도로파손', '불법주정차', '소음'
  confidence: number;     // 추출 신뢰도(0~1)
  category: string;       // 예: '교통/도로', '청소/환경', '안전'
}

interface RoutingInfo {
  department: string;     // 배정 부서
  handler?: string;       // 담당자
  priority: 'low' | 'normal' | 'high' | 'urgent';
  slaHours: number;       // 목표 처리 시간
}

interface TimelineItem {
  at: string;             // ISO 시간
  action: string;         // '접수', '검토중', '처리중', '완료', '반려'
  note?: string;
}

interface CivilAnalysis {
  overallScore: number;       // 민원 응급성/명확성/배정적합성 종합 점수(0~100)
  reporter: ReporterInfo;
  sections: SectionScore[];
  skills: TagSkill[];         // 상위 태그(차트에서 사용)
  routing: RoutingInfo;
  timeline: TimelineItem[];
  location: string;           // 발생 위치 (행정동/주소 등)
  channel: Channel;
  attachments?: number;       // 첨부 파일 개수
  analysisDate: string;       // 분석 시각
  textLength: number;         // 민원 본문 길이(문자 수)
}

// 대시보드 호환: Resume 인터페이스 형태를 유지하되 민원 의미로 사용
interface CivilRecord {
  id: string;
  filename: string;           // 민원 제목(or 접수번호) 표시용
  uploadDate: string;         // 접수 시각
  status: ComplaintStatus | 'completed' | 'processing' | 'failed' | 'queued';
  analysis?: CivilAnalysis;
}

interface BackendStatus {
  available: boolean;
  url: string;
}
interface ModeInfo {
  mode: 'backend' | 'demo';
  features: string[];
}

class CivilApiService {
  private baseUrl = 'http://localhost:5000/civil-api';
  private isBackendAvailable = false;
  private mockComplaints: CivilRecord[] = [];
  private processingJobs = new Map<string, { status: string; progress: number; recordId: string }>();

  constructor() {
    this.seedMock();
    console.log('🏛️ Civil API Service initialized (demo mode)');
  }


  // CivilApiService 내부에 추가
async getAllComplaints(): Promise<ComplaintDTO[]> {
  // 기존 mockComplaints를 대시보드가 쓰는 형태로 변환
  const list = await this.getAllResumes();
  return list.map((r) => {
    const a = r.analysis;
    const { firstResponseAt, resolvedAt } = this.extractTimes(a?.timeline || []);
    return {
      id: r.id,
      title: r.filename,
      category: this.pickCategoryFromTags(a?.skills) || this.mapDeptToCategory(a?.routing?.department) || '기타',
      priority: a?.routing?.priority,
      channel: a?.channel,
      createdAt: r.uploadDate,
      updatedAt: a?.analysisDate,
      firstResponseAt,
      resolvedAt,
      status: (r.status as string) || 'unknown',
      // 만족도: 완료건 위주로 3.2~4.9 범위로 적당히 생성 (데모)
      satisfactionScore:
        r.status === 'resolved'
          ? Math.round((3.2 + Math.random() * 1.7) * 10) / 10
          : undefined,
    };
  });
}

private extractTimes(timeline: TimelineItem[]): { firstResponseAt?: string; resolvedAt?: string } {
  let firstResponseAt: string | undefined;
  let resolvedAt: string | undefined;
  for (const t of timeline) {
    if (!firstResponseAt && (t.action === '검토중' || t.action === '처리중')) {
      firstResponseAt = t.at;
    }
    if (t.action === '완료') {
      resolvedAt = t.at;
    }
  }
  return { firstResponseAt, resolvedAt };
}

// 태그에서 대표 카테고리 뽑기
private pickCategoryFromTags(skills?: TagSkill[]): string | undefined {
  if (!skills || skills.length === 0) return undefined;
  // 가장 신뢰도 높은 태그 기준
  const top = [...skills].sort((a, b) => b.confidence - a.confidence)[0];
  // 태그명을 그대로 쓰되, 몇몇은 보기 좋은 라벨로
  const map: Record<string, string> = {
    '도로파손': '교통·도로',
    '불법주정차': '교통·도로',
    '가로등고장': '안전·시설',
    '소음': '환경·소음',
    '악취': '환경·악취',
    '쓰레기무단투기': '청소·환경',
    '보도블록파손': '교통·도로',
  };
  return map[top.name] || top.category || top.name;
}

// 부서명을 카테고리로 변환(백업)
private mapDeptToCategory(dept?: string): string | undefined {
  if (!dept) return undefined;
  const map: Record<string, string> = {
    '도로관리과': '교통·도로',
    '환경관리과': '환경·위생',
    '안전총괄과': '안전·시설',
    '민원총괄팀': '일반·기타',
  };
  return map[dept] || '기타';
}

  // --- public APIs (대시보드에서 사용 중인 메서드 시그니처 유지) ---

  // 기존 getAllResumes() 호출 호환: 민원 리스트 반환
  async getAllResumes(): Promise<CivilRecord[]> {
    await this.delay(400);
    // 최신순
    return [...this.mockComplaints].reverse();
  }

  async retryConnection(): Promise<boolean> {
    await this.delay(1200);
    // 데모에선 비연결 유지
    console.log('🔌 Backend connection attempt (demo)… not available.');
    return false;
  }

  getBackendStatus(): BackendStatus {
    return { available: this.isBackendAvailable, url: this.baseUrl };
  }

  getModeInfo(): ModeInfo {
    return {
      mode: this.isBackendAvailable ? 'backend' : 'demo',
      features: [
        '민원 접수/분류 데모 데이터',
        '부서 배정 및 SLA 시뮬레이션',
        '태그/키워드 기반 통계',
        '처리 단계 타임라인',
        '차트 시각화',
        '파일 업로드 시뮬레이션'
      ]
    };
  }

  // --- 민원 도메인용 추가 편의 API (필요 시 UI에서 사용) ---

  async submitComplaint(
    title: string,
    payload?: { channel?: Channel; departmentHint?: string; priority?: RoutingInfo['priority'] }
  ): Promise<{ jobId: string; recordId: string }> {
    await this.delay(600);
    const recordId = this.id();
    const jobId = this.id();

    this.mockComplaints.unshift({
      id: recordId,
      filename: title || `민원-${recordId}`,
      uploadDate: new Date().toISOString(),
      status: 'in_progress'
    });

    this.processingJobs.set(jobId, { status: 'processing', progress: 0, recordId });

    // 3초 후 자동 분석/배정 완료
    setTimeout(() => this.finishProcessing(recordId, jobId, payload), 3000);

    return { jobId, recordId };
  }

  async getAnalysisStatus(jobId: string): Promise<{ status: 'processing' | 'completed' | 'failed' | 'unknown'; progress?: number }> {
    await this.delay(300);
    const j = this.processingJobs.get(jobId);
    if (!j) return { status: 'unknown' };
    return { status: (j.status as any) || 'processing', progress: j.progress };
  }

  async getComplaintDetails(recordId: string): Promise<CivilAnalysis> {
    await this.delay(300);
    const rec = this.mockComplaints.find(r => r.id === recordId);
    if (!rec?.analysis) throw new Error('분석 결과가 아직 없습니다.');
    return rec.analysis;
  }

  async exportSummary(ids: string[], format: 'csv' | 'json'): Promise<Blob> {
    await this.delay(800);
    const rows = ids.map(id => {
      const r = this.mockComplaints.find(x => x.id === id);
      return {
        title: r?.filename ?? 'N/A',
        status: r?.status ?? 'N/A',
        score: r?.analysis?.overallScore ?? 0,
        department: r?.analysis?.routing.department ?? 'N/A',
        priority: r?.analysis?.routing.priority ?? 'N/A',
        slaHours: r?.analysis?.routing.slaHours ?? 0
      };
    });

    const text =
      format === 'csv'
        ? ['title,status,score,department,priority,slaHours', ...rows.map(r => `${r.title},${r.status},${r.score},${r.department},${r.priority},${r.slaHours}`)].join('\n')
        : JSON.stringify(rows, null, 2);

    return new Blob([text], { type: format === 'csv' ? 'text/csv' : 'application/json' });
  }

  // --- 내부 로직 & 목데이터 ---

  private seedMock() {
    const now = Date.now();

    const make = (overrides: Partial<CivilRecord> & { analysis?: Partial<CivilAnalysis> }): CivilRecord => {
      const id = this.id();
      const baseScore = this.randInt(62, 94);

      const tags: TagSkill[] = this.pickTags();
      const dept = this.routeByTags(tags);
      const status: ComplaintStatus = this.pickOne(['received', 'in_review', 'in_progress', 'resolved', 'rejected']);

      const record: CivilRecord = {
        id,
        filename: overrides.filename || `도로파손 신고 #${this.randInt(1000, 9999)}`,
        uploadDate: new Date(now - this.randInt(1, 14) * 86400 * 1000).toISOString(),
        status: overrides.status as any || status,
        analysis: {
          overallScore: overrides.analysis?.overallScore ?? baseScore,
          reporter: overrides.analysis?.reporter || {
            name: this.pickOne(['김민수', '이서연', '박지후', '최유진', '정하늘']),
            phone: '010-1234-5678',
            email: 'reporter@example.com',
            address: this.pickOne(['부산 금정구 장전동', '부산 남구 대연동', '부산 연제구 연산동'])
          },
          sections: overrides.analysis?.sections || [
            { name: '접수 정확도', score: baseScore + this.randInt(-5, 5), status: 'good', found: true },
            { name: '분류 적합도', score: baseScore + this.randInt(-5, 5), status: 'good', found: true },
            { name: 'SLA 준수', score: baseScore + this.randInt(-10, 3), status: 'average', found: true },
            { name: '중복 여부', score: this.randInt(70, 98), status: 'good', found: true }
          ],
          skills: overrides.analysis?.skills || tags,
          routing: overrides.analysis?.routing || {
            department: dept,
            handler: this.pickOne(['홍길동', '김담당', '이매니저']),
            priority: this.pickOne(['normal', 'high', 'urgent']),
            slaHours: this.slaByDept(dept)
          },
          timeline: overrides.analysis?.timeline || [
            { at: new Date(now - this.randInt(1, 5) * 3600 * 1000).toISOString(), action: '접수' },
            { at: new Date(now - this.randInt(1, 4) * 3600 * 1000).toISOString(), action: '검토중' }
          ],
          location: overrides.analysis?.location || this.pickOne(['금정구청 인근', '장전역 3번출구', '온천천 산책로']),
          channel: overrides.analysis?.channel || this.pickOne(['web', 'mobile', 'phone']),
          attachments: overrides.analysis?.attachments ?? this.randInt(0, 3),
          analysisDate: new Date(now - this.randInt(0, 2) * 3600 * 1000).toISOString(),
          textLength: overrides.analysis?.textLength ?? this.randInt(400, 1400)
        }
      };

      // 완료/반려 상태면 타임라인에 완료/반려 추가
      if (record.status === 'resolved') {
        record.analysis!.timeline.push({ at: new Date(now - this.randInt(10, 60) * 60 * 1000).toISOString(), action: '완료', note: '보수 작업 완료' });
      } else if (record.status === 'rejected') {
        record.analysis!.timeline.push({ at: new Date(now - this.randInt(10, 60) * 60 * 1000).toISOString(), action: '반려', note: '중복 민원' });
      }

      return record;
    };

    this.mockComplaints = [
      make({ filename: '불법주정차 신고(장전초 앞)', status: 'resolved' }),
      make({ filename: '가로등 고장 문의', status: 'in_progress' }),
      make({ filename: '도로 파손으로 차량 파손 우려', status: 'in_review' }),
      make({ filename: '하수구 악취 민원', status: 'received' }),
      make({ filename: '공사 소음/진동 관련', status: 'rejected' })
    ];
  }

  private finishProcessing(recordId: string, jobId: string, payload?: { channel?: Channel; departmentHint?: string; priority?: RoutingInfo['priority'] }) {
    const idx = this.mockComplaints.findIndex(r => r.id === recordId);
    if (idx === -1) return;

    const base = this.mockComplaints[idx];
    const tags = this.pickTags();
    const dept = payload?.departmentHint || this.routeByTags(tags);
    const final: CivilRecord = {
      ...base,
      status: 'resolved',
      analysis: {
        ...(base.analysis as CivilAnalysis),
        overallScore: this.randInt(70, 95),
        skills: tags,
        routing: {
          department: dept,
          handler: this.pickOne(['홍길동', '김담당', '이매니저']),
          priority: payload?.priority || this.pickOne(['normal', 'high']),
          slaHours: this.slaByDept(dept)
        },
        timeline: [
          { at: new Date(Date.now() - 120 * 60 * 1000).toISOString(), action: '접수' },
          { at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), action: '검토중' },
          { at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), action: '처리중' },
          { at: new Date().toISOString(), action: '완료', note: '현장 출동 후 임시 보수' }
        ],
        analysisDate: new Date().toISOString()
      }
    };

    this.mockComplaints[idx] = final;
    this.processingJobs.set(jobId, { status: 'completed', progress: 100, recordId });
  }

  // --- 유틸 ---

  private id() { return Math.random().toString(36).slice(2, 11); }
  private delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
  private randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  private pickOne<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  private pickTags(): TagSkill[] {
    const pool: TagSkill[] = [
      { name: '도로파손', confidence: 0.9, category: '교통/도로' },
      { name: '불법주정차', confidence: 0.88, category: '교통/도로' },
      { name: '가로등고장', confidence: 0.86, category: '안전' },
      { name: '소음', confidence: 0.8, category: '환경' },
      { name: '악취', confidence: 0.78, category: '환경' },
      { name: '쓰레기무단투기', confidence: 0.83, category: '청소/환경' },
      { name: '보도블록파손', confidence: 0.85, category: '교통/도로' }
    ];
    const n = this.randInt(3, 5);
    return Array.from({ length: n }, (_, i) => pool[i]);
  }

  private routeByTags(tags: TagSkill[]): string {
    const cats = new Set(tags.map(t => t.category));
    if (cats.has('교통/도로')) return '도로관리과';
    if (cats.has('환경') || cats.has('청소/환경')) return '환경관리과';
    if (cats.has('안전')) return '안전총괄과';
    return '민원총괄팀';
    }

  private slaByDept(dept: string): number {
    switch (dept) {
      case '도로관리과': return 48;
      case '환경관리과': return 36;
      case '안전총괄과': return 24;
      default: return 72;
    }
  }
}

// 싱글톤 export (대시보드 호환 유지)
export const atsApi = new CivilApiService();