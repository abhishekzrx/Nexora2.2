/**
 * iconRegistry
 * Centralized icon registry mapping logical names to Material UI icons.
 * Pages should never import MUI icons directly — always use <AppIcon name="..." />.
 *
 * Each entry: { component, optical }
 * - component: the MUI icon component
 * - optical: optical size adjustment in px for visual balance.
 *   Icons with thin strokes or large internal whitespace need a positive
 *   adjustment; dense/filled icons may need a negative one.
 */
import HomeRounded from '@mui/icons-material/HomeRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import TrackChangesRounded from '@mui/icons-material/TrackChangesRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import EditNoteRounded from '@mui/icons-material/EditNoteRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded'
import DescriptionRounded from '@mui/icons-material/DescriptionRounded'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import HelpRounded from '@mui/icons-material/HelpRounded'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import BookmarkRounded from '@mui/icons-material/BookmarkRounded'
import CalendarTodayRounded from '@mui/icons-material/CalendarTodayRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import TimerRounded from '@mui/icons-material/TimerRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import FlagRounded from '@mui/icons-material/FlagRounded'
import LightbulbRounded from '@mui/icons-material/LightbulbRounded'
import AssignmentRounded from '@mui/icons-material/AssignmentRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import MilitaryTechRounded from '@mui/icons-material/MilitaryTechRounded'
import StarRounded from '@mui/icons-material/StarRounded'
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded'
import SmartToyRounded from '@mui/icons-material/SmartToyRounded'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import ViewListRounded from '@mui/icons-material/ViewListRounded'
import GridViewRounded from '@mui/icons-material/GridViewRounded'
import CenterFocusStrongRounded from '@mui/icons-material/CenterFocusStrongRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import LanRounded from '@mui/icons-material/LanRounded'
import DesktopWindowsRounded from '@mui/icons-material/DesktopWindowsRounded'
import StorageRounded from '@mui/icons-material/StorageRounded'
import DeveloperBoardRounded from '@mui/icons-material/DeveloperBoardRounded'
import CodeRounded from '@mui/icons-material/CodeRounded'
import MemoryRounded from '@mui/icons-material/MemoryRounded'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import SchoolRounded from '@mui/icons-material/SchoolRounded'
import ComputerRounded from '@mui/icons-material/ComputerRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import FolderRounded from '@mui/icons-material/FolderRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'
import ScienceRounded from '@mui/icons-material/ScienceRounded'
import BiotechRounded from '@mui/icons-material/BiotechRounded'
import FileUploadRounded from '@mui/icons-material/FileUploadRounded'
import SpaceDashboardRounded from '@mui/icons-material/SpaceDashboardRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import LockRounded from '@mui/icons-material/LockRounded'
import LockOpenRounded from '@mui/icons-material/LockOpenRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'

export const iconRegistry = {
  // ── Navigation ──────────────────────────────────────────────
  home: { component: HomeRounded, optical: 0 },
  subjects: { component: MenuBookRounded, optical: 0 },
  practice: { component: TrackChangesRounded, optical: 2 },
  flashcards: { component: StyleRounded, optical: 0 },
  mockTests: { component: EditNoteRounded, optical: 0 },
  analytics: { component: BarChartRounded, optical: 0 },
  studyPlanner: { component: CalendarMonthRounded, optical: 0 },
  leaderboard: { component: EmojiEventsRounded, optical: 0 },
  notes: { component: DescriptionRounded, optical: 0 },
  notifications: { component: NotificationsRounded, optical: 0 },
  settings: { component: SettingsRounded, optical: 0 },
  help: { component: HelpRounded, optical: 0 },
  more: { component: MoreHorizRounded, optical: 1 },
  profile: { component: AccountCircleRounded, optical: 0 },
  menu: { component: MenuRounded, optical: 1 },
  search: { component: SearchRounded, optical: 2 },
  back: { component: ArrowBackRounded, optical: 1 },
  close: { component: CloseRounded, optical: 2 },
  logout: { component: LogoutRounded, optical: 0 },
  chevronDown: { component: ExpandMoreRounded, optical: 1 },
  moreVert: { component: MoreVertRounded, optical: 1 },
  chevronRight: { component: ArrowForwardRounded, optical: 1 },
  bookmark: { component: BookmarkRounded, optical: 0 },
  centerBook: { component: WorkspacePremiumRounded, optical: 0 },

  // ── Stats & status ──────────────────────────────────────────
  calendar: { component: CalendarTodayRounded, optical: 0 },
  streak: { component: LocalFireDepartmentRounded, optical: 0 },
  goal: { component: TrackChangesRounded, optical: 2 },
  target: { component: TrackChangesRounded, optical: 2 },
  check: { component: CheckRounded, optical: 2 },
  cross: { component: CloseRounded, optical: 2 },
  trendingUp: { component: TrendingUpRounded, optical: 1 },
  trendingDown: { component: TrendingDownRounded, optical: 1 },
  clock: { component: ScheduleRounded, optical: 0 },
  timer: { component: TimerRounded, optical: 0 },
  pause: { component: PauseRounded, optical: 0 },
  flag: { component: FlagRounded, optical: 0 },
  lightbulb: { component: LightbulbRounded, optical: 0 },
  submit: { component: AssignmentRounded, optical: 0 },
  send: { component: SendRounded, optical: 0 },
  remove: { component: RemoveRounded, optical: 2 },
  refresh: { component: RefreshRounded, optical: 0 },
  arrowForward: { component: ArrowForwardRounded, optical: 1 },
  arrowUp: { component: ArrowUpwardRounded, optical: 1 },
  arrowDown: { component: ArrowDownwardRounded, optical: 1 },
  medal: { component: MilitaryTechRounded, optical: 0 },
  trophy: { component: EmojiEventsRounded, optical: 0 },
  star: { component: StarRounded, optical: 0 },
  rocket: { component: RocketLaunchRounded, optical: 0 },
  aiCoach: { component: SmartToyRounded, optical: 0 },
  sort: { component: SwapVertRounded, optical: 1 },
  filter: { component: FilterListRounded, optical: 1 },
  viewList: { component: ViewListRounded, optical: 0 },
  viewGrid: { component: GridViewRounded, optical: 0 },
  quickJump: { component: CenterFocusStrongRounded, optical: 1 },
  examMode: { component: CenterFocusStrongRounded, optical: 1 },
  quiz: { component: QuizRounded, optical: 0 },
  lightMode: { component: LightModeRounded, optical: 0 },
  darkMode: { component: DarkModeRounded, optical: 0 },
  chapters: { component: MenuBookRounded, optical: 0 },
  mcqs: { component: QuizRounded, optical: 0 },
  flashcardsTab: { component: StyleRounded, optical: 0 },
  notesTab: { component: EditNoteRounded, optical: 0 },
  analyticsTab: { component: BarChartRounded, optical: 0 },
  document: { component: DescriptionRounded, optical: 0 },
  gridView: { component: GridViewRounded, optical: 0 },
  notVisited: { component: ScheduleRounded, optical: 0 },
  testDetails: { component: DescriptionRounded, optical: 0 },
  reviewAnswers: { component: DescriptionRounded, optical: 0 },
  practiceAgain: { component: RefreshRounded, optical: 0 },
  backToSubjects: { component: ArrowForwardRounded, optical: 1 },
  hundred: { component: WorkspacePremiumRounded, optical: 0 },
  computer: { component: ComputerRounded, optical: 0 },

  // ── Subjects ────────────────────────────────────────────────
  computerNetworks: { component: LanRounded, optical: 0 },
  operatingSystems: { component: DesktopWindowsRounded, optical: 0 },
  dbms: { component: StorageRounded, optical: 0 },
  digitalElectronics: { component: DeveloperBoardRounded, optical: 0 },
  dataStructures: { component: CodeRounded, optical: 1 },
  computerOrganization: { component: MemoryRounded, optical: 0 },

  // ── Admin ──────────────────────────────────────────────────
  adminDashboard: { component: SpaceDashboardRounded, optical: 0 },
  add: { component: AddRounded, optical: 1 },
  edit: { component: EditRounded, optical: 0 },
  delete: { component: DeleteRounded, optical: 1 },
  dragHandle: { component: DragIndicatorRounded, optical: 1 },
  warning: { component: WarningRounded, optical: 0 },
  folder: { component: FolderRounded, optical: 0 },
  upload: { component: FileUploadRounded, optical: 1 },
  physics: { component: BoltRounded, optical: 0 },
  chemistry: { component: ScienceRounded, optical: 0 },
  biology: { component: BiotechRounded, optical: 0 },
  copy: { component: ContentCopyRounded, optical: 0 },
  lock: { component: LockRounded, optical: 0 },
  lockOpen: { component: LockOpenRounded, optical: 0 },
}

export default iconRegistry