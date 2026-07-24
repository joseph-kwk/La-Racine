import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { treeAPI, calendarAPI } from '../services/api';
import {
  CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Search, Share2, MapPin, Clock, RefreshCw, X, Trash2
} from './CalendarIcons';
import CalendarExportModal from './CalendarExportModal';

const CalendarView = () => {
  const { t } = useTranslation();
  const [trees, setTrees] = useState([]);
  const [selectedTreeId, setSelectedTreeId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [kinshipScope, setKinshipScope] = useState('all'); // 'all' | 'immediate' | 'lineal' | 'extended'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Timezone Detection
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    } catch {
      return 'Local Time';
    }
  }, []);

  // Modals & Popovers
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDayModal, setSelectedDayModal] = useState(null); // { dateStr, events }

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'reunion',
    start_date: '',
    end_date: '',
    location: '',
    is_annual_recurring: false,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTrees();
  }, []);

  useEffect(() => {
    if (selectedTreeId) {
      loadEvents(selectedTreeId, kinshipScope);
    }
  }, [selectedTreeId, kinshipScope]);

  const loadTrees = async () => {
    try {
      const res = await treeAPI.getAll();
      const treeList = res.data.results || res.data || [];
      setTrees(treeList);
      if (treeList.length > 0) {
        setSelectedTreeId(treeList[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load family trees:', err);
      setLoading(false);
    }
  };

  const loadEvents = async (treeId, scope = 'all') => {
    setLoading(true);
    try {
      const res = await calendarAPI.getAggregatedEvents(treeId, scope);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to load aggregated calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTree = useMemo(() => {
    return trees.find(t => t.id === Number(selectedTreeId)) || trees[0];
  }, [trees, selectedTreeId]);

  // Quick Stat Counters
  const stats = useMemo(() => {
    const bdays = events.filter(e => e.category === 'Birthday').length;
    const annivs = events.filter(e => e.category === 'Anniversary').length;
    const reunions = events.filter(e => e.category === 'Reunion' || e.category === 'Gathering' || e.category === 'Ceremony').length;
    const memorials = events.filter(e => e.category === 'Memorial').length;
    return { bdays, annivs, reunions, memorials, total: events.length };
  }, [events]);

  // Enhanced Event Filter
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesSearch = searchQuery === '' ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' ||
        ev.category.toUpperCase() === categoryFilter.toUpperCase();

      return matchesSearch && matchesCat;
    });
  }, [events, searchQuery, categoryFilter]);

  // Date Navigation Actions
  const prevPeriod = () => {
    if (activeView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (activeView === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const nextPeriod = () => {
    if (activeView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (activeView === 'week') {
      const nextW = new Date(currentDate);
      nextW.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextW);
    }
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Days Calculation
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentDate]);

  // Week Days Calculation
  const daysInWeek = useMemo(() => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay(); // Sunday
    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(curr.setDate(first + i));
      week.push(nextDay);
    }
    return week;
  }, [currentDate]);

  // Map events to date strings (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(ev => {
      if (!ev.start_date) return;
      const evDate = new Date(ev.start_date);
      if (isNaN(evDate.getTime())) return;

      let dateKey = ev.start_date.substring(0, 10);
      if (ev.is_recurring) {
        const curYear = currentDate.getFullYear();
        const mStr = String(evDate.getMonth() + 1).padStart(2, '0');
        const dStr = String(evDate.getDate()).padStart(2, '0');
        dateKey = `${curYear}-${mStr}-${dStr}`;
      }

      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [filteredEvents, currentDate]);

  // Category Accent Card Styling
  const getCategoryBadgeClass = (category) => {
    switch (category.toUpperCase()) {
      case 'BIRTHDAY':
        return 'bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-200 border-l-4 border-l-rose-500 border-rose-500/30 hover:border-rose-400';
      case 'ANNIVERSARY':
        return 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-200 border-l-4 border-l-emerald-500 border-emerald-500/30 hover:border-emerald-400';
      case 'MEMORIAL':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-l-4 border-l-amber-500 border-amber-500/30 hover:border-amber-400';
      case 'REUNION':
      case 'GATHERING':
      case 'CEREMONY':
        return 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-l-4 border-l-indigo-500 border-indigo-500/30 hover:border-indigo-400';
      default:
        return 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border-l-4 border-l-cyan-500 border-cyan-500/30 hover:border-cyan-400';
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!selectedTreeId) return;
    setCreating(true);
    try {
      await calendarAPI.createEvent({
        ...newEvent,
        tree: selectedTreeId,
      });
      setIsCreateModalOpen(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        event_type: 'reunion',
        is_annual_recurring: false,
      });
      loadEvents(selectedTreeId, kinshipScope);
    } catch (err) {
      console.error('Failed to create family event:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCustomEvent = async (customEventId) => {
    if (!window.confirm(t('calendar.confirmDeleteEvent', 'Are you sure you want to delete this event?'))) {
      return;
    }
    try {
      await calendarAPI.deleteEvent(customEventId);
      setSelectedEvent(null);
      if (selectedTreeId) {
        loadEvents(selectedTreeId, kinshipScope);
      }
    } catch (err) {
      console.error('Failed to delete custom event:', err);
    }
  };

  const handleOpenQuickAddDate = (dateStr) => {
    setNewEvent(prev => ({ ...prev, start_date: `${dateStr}T10:00` }));
    setIsCreateModalOpen(true);
  };

  const getGoogleCalendarUrl = (ev) => {
    if (!ev) return '';
    const title = encodeURIComponent(ev.title);
    const details = encodeURIComponent(ev.description || '');
    const location = encodeURIComponent(ev.location || '');
    
    let dates = '';
    if (ev.start_date) {
      const s = new Date(ev.start_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
      const e = ev.end_date ? new Date(ev.end_date).toISOString().replace(/-|:|\.\d\d\d/g, '') : s;
      dates = `${s}/${e}`;
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex flex-col items-center justify-center">
      {/* Sleek Centered Header Bar */}
      <div className="w-full bg-slate-900/95 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 shrink-0 ring-4 ring-emerald-500/10">
            <CalendarIcon className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
                {t('calendar.title', 'Family Tree Calendar')}
              </h1>
              {/* Timezone badge */}
              <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-extrabold shadow-inner">
                🌐 {userTimezone}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              {t('calendar.subtitle', 'Birthdays, anniversaries, reunions & family gatherings')}
            </p>
          </div>
        </div>

        {/* Header Control Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tree selector */}
          <div className="relative">
            <select
              value={selectedTreeId}
              onChange={(e) => setSelectedTreeId(e.target.value)}
              className="bg-slate-950/90 border border-slate-700/80 text-slate-200 text-xs font-extrabold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner appearance-none pr-8 cursor-pointer"
            >
              {trees.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              ▼
            </div>
          </div>

          {/* Sync / Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition shadow-md hover:scale-[1.02] active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('calendar.syncBtn', 'Sync with Google/iCal')}</span>
          </button>

          {/* Add Event Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('calendar.newEventBtn', 'Add Family Event')}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Stat Banner */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center space-x-4 shadow-lg backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🎂
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats.bdays}</div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('calendar.catBirthday', 'Birthdays')}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center space-x-4 shadow-lg backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            💍
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats.annivs}</div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('calendar.catAnniversary', 'Anniversaries')}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center space-x-4 shadow-lg backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🎪
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats.reunions}</div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('calendar.catReunion', 'Reunions')}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center space-x-4 shadow-lg backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🕯️
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats.memorials}</div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('calendar.catMemorial', 'Memorials')}</div>
          </div>
        </div>
      </div>

      {/* Kinship Scope Segmented Switcher Bar */}
      <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-3 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider pl-2 shrink-0">
          {t('calendar.kinshipScopeLabel', 'Kinship Scope:')}
        </span>
        <div className="flex items-center space-x-2 overflow-x-auto w-full lg:w-auto justify-start lg:justify-end pb-1 lg:pb-0">
          {[
            { key: 'all', label: t('calendar.scopeAll', '🌳 Full Tree'), desc: 'All connected members' },
            { key: 'immediate', label: t('calendar.scopeImmediate', '🏠 Immediate Family'), desc: 'Parents, Children, Siblings, Spouse' },
            { key: 'lineal', label: t('calendar.scopeLineal', '📜 Direct Lineage'), desc: 'Ancestors & Descendants' },
            { key: 'extended', label: t('calendar.scopeExtended', '👨‍👩‍👧‍👦 Extended Family'), desc: 'Aunts, Uncles, Cousins, In-Laws' },
          ].map((sc) => (
            <button
              key={sc.key}
              onClick={() => setKinshipScope(sc.key)}
              title={sc.desc}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap border ${
                kinshipScope === sc.key
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-md backdrop-blur-xl">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('calendar.searchPlaceholder', 'Filter events...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-500 shadow-inner font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {['ALL', 'BIRTHDAY', 'ANNIVERSARY', 'MEMORIAL', 'REUNION'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap border ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs scale-105'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              {cat === 'ALL' && t('calendar.catAll', 'All Events')}
              {cat === 'BIRTHDAY' && '🎂 ' + t('calendar.catBirthday', 'Birthdays')}
              {cat === 'ANNIVERSARY' && '💍 ' + t('calendar.catAnniversary', 'Anniversaries')}
              {cat === 'MEMORIAL' && '🕯️ ' + t('calendar.catMemorial', 'Memorials')}
              {cat === 'REUNION' && '🎪 ' + t('calendar.catReunion', 'Reunions')}
            </button>
          ))}
        </div>

        {/* View Switcher (Month | Week | Agenda) */}
        <div className="flex items-center space-x-1 bg-slate-950/90 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveView('month')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
              activeView === 'month' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('calendar.viewMonth', 'Month')}
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
              activeView === 'week' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('calendar.viewWeek', 'Week')}
          </button>
          <button
            onClick={() => setActiveView('agenda')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
              activeView === 'agenda' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('calendar.viewAgenda', 'Agenda')}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="w-full flex flex-col items-center justify-center py-24 bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-400 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-400" />
          <p className="text-sm font-semibold">{t('common.loading', 'Loading calendar events...')}</p>
        </div>
      ) : activeView === 'month' ? (
        /* Month Grid View */
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header Navigation */}
          <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
            <h2 className="text-xl font-black text-slate-100 tracking-tight">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={today}
                className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-black transition shadow-xs"
              >
                {t('calendar.today', 'Today')}
              </button>
              <button
                onClick={prevPeriod}
                className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700/60"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextPeriod}
                className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700/60"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 border-b border-slate-800/80 text-center bg-slate-950/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 bg-slate-950/30">
            {daysInMonth.map((dayDate, index) => {
              if (!dayDate) {
                return (
                  <div key={`empty-${index}`} className="min-h-[140px] p-2 bg-slate-950/40 opacity-40" />
                );
              }

              const yyyy = dayDate.getFullYear();
              const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              const dayEvents = eventsByDate[dateStr] || [];

              const isToday = new Date().toDateString() === dayDate.toDateString();

              return (
                <div
                  key={dateStr}
                  className={`min-h-[140px] p-3 flex flex-col justify-between transition-all group ${
                    isToday
                      ? 'bg-emerald-950/40 border-2 border-emerald-500/70 shadow-inner'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isToday
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/40 animate-pulse'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayDate.getDate()}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenQuickAddDate(dateStr)}
                        title={t('calendar.quickAddTooltip', 'Add event on this date')}
                        className="text-[10px] text-slate-500 hover:text-emerald-400 hover:bg-slate-800/80 p-1 rounded-lg transition opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700/60">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1.5 overflow-y-auto max-h-[95px] pr-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold truncate transition-all shadow-xs hover:scale-[1.03] ${getCategoryBadgeClass(ev.category)}`}
                      >
                        {ev.title}
                      </button>
                    ))}

                    {/* "+N more" expansion indicator */}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => setSelectedDayModal({ dateStr, events: dayEvents })}
                        className="w-full text-center py-1 text-[10px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 rounded-lg transition border border-emerald-500/30"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeView === 'week' ? (
        /* Week View */
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl p-6 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-200">
              Week of {daysInWeek[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – {daysInWeek[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={prevPeriod} className="p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextPeriod} className="p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {daysInWeek.map((dayDate) => {
              const yyyy = dayDate.getFullYear();
              const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = new Date().toDateString() === dayDate.toDateString();

              return (
                <div
                  key={dateStr}
                  className={`bg-slate-950/60 border rounded-2xl p-3 space-y-2 min-h-[180px] ${
                    isToday ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-black text-slate-400">
                      {dayDate.toLocaleDateString('default', { weekday: 'short' })}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isToday ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
                    }`}>
                      {dayDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-semibold transition hover:scale-[1.02] ${getCategoryBadgeClass(ev.category)}`}
                      >
                        <p className="font-bold truncate">{ev.title}</p>
                      </button>
                    ))}
                    {dayEvents.length === 0 && (
                      <p className="text-[11px] text-slate-600 italic py-4 text-center">No events</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View List */
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 backdrop-blur-xl">
          <h3 className="text-lg font-black text-slate-100 border-b border-slate-800/80 pb-4">
            {t('calendar.agendaTitle', 'Upcoming Family Events & Milestones')}
          </h3>

          {filteredEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center font-medium">
              {t('calendar.noEvents', 'No events found matching your filter criteria.')}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm hover:scale-[1.01]"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-xl shrink-0 shadow-inner">
                      {ev.title.split(' ')[0]}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-100 text-sm sm:text-base">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ev.description}</p>
                      )}
                      {ev.location && (
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <div className="text-xs font-black text-slate-200">
                      {ev.start_date.substring(0, 10)}
                    </div>
                    <div className="flex items-center justify-end space-x-1.5">
                      {ev.kinship_label && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-800 text-emerald-400 border border-emerald-500/30">
                          {ev.kinship_label}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase px-3 py-0.5 rounded-lg inline-block ${getCategoryBadgeClass(ev.category)}`}>
                        {ev.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date Overflow Modal */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-base font-bold text-slate-100">
                Events for {selectedDayModal.dateStr}
              </h3>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {selectedDayModal.events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedDayModal(null);
                    setSelectedEvent(ev);
                  }}
                  className={`p-3 rounded-xl cursor-pointer text-xs font-semibold transition hover:scale-[1.02] ${getCategoryBadgeClass(ev.category)}`}
                >
                  <p className="font-bold">{ev.title}</p>
                  {ev.description && <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">{ev.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900/95 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden backdrop-blur-xl">
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-black text-slate-100 leading-snug">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition shrink-0"
                >
                  ✕
                </button>
              </div>

              {selectedEvent.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  {selectedEvent.description}
                </p>
              )}

              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Date: <b className="text-slate-100">{selectedEvent.start_date.substring(0, 10)}</b></span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center space-x-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Location: <b className="text-slate-100">{selectedEvent.location}</b></span>
                  </div>
                )}
              </div>

              {/* Add to Google Calendar & Delete Action */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <a
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('calendar.addToGoogleCalendar', 'Add to Google Calendar (1-Click)')}</span>
                </a>

                {selectedEvent.custom_event_id && (
                  <button
                    onClick={() => handleDeleteCustomEvent(selectedEvent.custom_event_id)}
                    className="w-full sm:w-auto px-4 py-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('calendar.deleteEventBtn', 'Delete Event')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900/95 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-xl font-black text-slate-100">{t('calendar.createEventTitle', 'Add Custom Family Event')}</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {t('calendar.eventTitleLabel', 'Event Title')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasongo Family Annual Reunion 2026"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    {t('calendar.eventTypeLabel', 'Event Type')}
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                  >
                    <option value="reunion">🎪 {t('calendar.catReunion', 'Reunion')}</option>
                    <option value="gathering">🎉 Gathering</option>
                    <option value="ceremony">🎖️ Ceremony</option>
                    <option value="memorial">🕯️ Memorial</option>
                    <option value="other">📅 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    {t('calendar.startDateLabel', 'Start Date & Time')} *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {t('calendar.locationLabel', 'Location')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kinshasa, DRC or Online Zoom"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {t('calendar.descriptionLabel', 'Description / Details')}
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide additional details..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                />
              </div>

              <div className="flex items-center space-x-3 py-1">
                <input
                  type="checkbox"
                  id="recurringCheck"
                  checked={newEvent.is_annual_recurring}
                  onChange={(e) => setNewEvent({ ...newEvent, is_annual_recurring: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="recurringCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  {t('calendar.recurringLabel', 'Repeats annually every year on this date')}
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  {creating ? t('common.saving', 'Saving...') : t('common.save', 'Save Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync & Export Feed Modal */}
      <CalendarExportModal
        treeId={selectedTreeId}
        treeName={selectedTree?.name || 'Family Tree'}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default CalendarView;
