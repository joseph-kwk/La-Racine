import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { treeAPI, calendarAPI } from '../services/api';
import {
  CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Search, Share2, MapPin, Clock, RefreshCw
} from './CalendarIcons';
import CalendarExportModal from './CalendarExportModal';

const CalendarView = () => {
  const { t } = useTranslation();
  const [trees, setTrees] = useState([]);
  const [selectedTreeId, setSelectedTreeId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('month'); // 'month' | 'week' | 'agenda'
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
      loadEvents(selectedTreeId);
    }
  }, [selectedTreeId]);

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

  const loadEvents = async (treeId) => {
    setLoading(true);
    try {
      const res = await calendarAPI.getAggregatedEvents(treeId);
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
        return 'bg-slate-800/80 text-slate-200 border-l-4 border-l-slate-500 border-slate-700/60';
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start_date || !selectedTreeId) return;
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
        event_type: 'reunion',
        start_date: '',
        end_date: '',
        location: '',
        is_annual_recurring: false,
      });
      loadEvents(selectedTreeId);
    } catch (err) {
      console.error('Failed to create custom family event:', err);
    } finally {
      setCreating(false);
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sleek Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                {t('calendar.title', 'Family Tree Calendar')}
              </h1>
              {/* Timezone badge */}
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700/80 text-[10px] font-mono text-emerald-400 font-bold shadow-xs">
                🌐 {userTimezone}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {t('calendar.subtitle', 'Birthdays, anniversaries, reunions & family gatherings')}
            </p>
          </div>
        </div>

        {/* Header Control Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tree selector */}
          <select
            value={selectedTreeId}
            onChange={(e) => setSelectedTreeId(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
          >
            {trees.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Sync / Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm hover:scale-[1.02] active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('calendar.syncBtn', 'Sync with Google/iCal')}</span>
          </button>

          {/* Add Event Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-emerald-900/40 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.newEventBtn', 'Add Family Event')}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Stat Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-lg shrink-0">
            🎂
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{stats.bdays}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('calendar.catBirthday', 'Birthdays')}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
            💍
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{stats.annivs}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('calendar.catAnniversary', 'Anniversaries')}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">
            🎪
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{stats.reunions}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('calendar.catReunion', 'Reunions')}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            🕯️
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{stats.memorials}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('calendar.catMemorial', 'Memorials')}</div>
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('calendar.searchPlaceholder', 'Filter events...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'BIRTHDAY', 'ANNIVERSARY', 'MEMORIAL', 'REUNION'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs scale-105'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40 border-slate-800/60'
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
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('month')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                activeView === 'month' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.viewMonth', 'Month')}
            </button>
            <button
              onClick={() => setActiveView('week')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                activeView === 'week' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.viewWeek', 'Week')}
            </button>
            <button
              onClick={() => setActiveView('agenda')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                activeView === 'agenda' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.viewAgenda', 'Agenda')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm">{t('common.loading', 'Loading calendar events...')}</p>
        </div>
      ) : activeView === 'month' ? (
        /* Month Grid */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Nav */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <h2 className="text-lg font-bold text-slate-100">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={today}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition shadow-xs"
              >
                {t('calendar.today', 'Today')}
              </button>
              <button
                onClick={prevPeriod}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextPeriod}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40 text-center py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/20">
            {daysInMonth.map((dayDate, idx) => {
              if (!dayDate) {
                return <div key={`empty-${idx}`} className="min-h-[120px] bg-slate-950/40" />;
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
                  className={`min-h-[120px] p-2 flex flex-col justify-start transition ${
                    isToday ? 'bg-emerald-950/30 border-2 border-emerald-500/60 shadow-inner' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6.5 h-6.5 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md animate-pulse'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayDate.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 overflow-y-auto max-h-[90px] pr-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-semibold truncate transition shadow-xs hover:scale-[1.02] ${getCategoryBadgeClass(ev.category)}`}
                      >
                        {ev.title}
                      </button>
                    ))}

                    {/* "+N more" expansion indicator */}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => setSelectedDayModal({ dateStr, events: dayEvents })}
                        className="w-full text-center py-0.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 rounded transition border border-emerald-500/20"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200">
              Week of {daysInWeek[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – {daysInWeek[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={prevPeriod} className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextPeriod} className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
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
                  className={`bg-slate-950/60 border rounded-xl p-3 space-y-2 min-h-[170px] ${
                    isToday ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      {dayDate.toLocaleDateString('default', { weekday: 'short' })}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'}`}>
                      {dayDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-2 rounded-lg text-xs font-semibold transition hover:scale-[1.02] ${getCategoryBadgeClass(ev.category)}`}
                      >
                        <p className="font-bold truncate">{ev.title}</p>
                      </button>
                    ))}
                    {dayEvents.length === 0 && (
                      <p className="text-[11px] text-slate-600 italic py-2">No events</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View List */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3">
            {t('calendar.agendaTitle', 'Upcoming Family Events & Milestones')}
          </h3>

          {filteredEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              {t('calendar.noEvents', 'No events found matching your filter criteria.')}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl flex items-center justify-between cursor-pointer transition shadow-xs hover:scale-[1.01]"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0 shadow-inner">
                      {ev.title.split(' ')[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{ev.description}</p>
                      )}
                      {ev.location && (
                        <div className="flex items-center space-x-1 text-[11px] text-emerald-400 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs font-bold text-slate-300">
                      {ev.start_date.substring(0, 10)}
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-md inline-block ${getCategoryBadgeClass(ev.category)}`}>
                      {ev.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day Expansion Modal (when date cell has >3 events) */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold">Events on {selectedDayModal.dateStr}</h3>
              <button onClick={() => setSelectedDayModal(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayModal.events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => { setSelectedDayModal(null); setSelectedEvent(ev); }}
                  className={`p-3 rounded-xl cursor-pointer ${getCategoryBadgeClass(ev.category)}`}
                >
                  <p className="font-bold text-xs">{ev.title}</p>
                  {ev.description && <p className="text-[11px] opacity-80 mt-0.5">{ev.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-slate-100">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {selectedEvent.description && (
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {selectedEvent.description}
                </p>
              )}

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Date: <b>{selectedEvent.start_date.substring(0, 10)}</b></span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Location: <b>{selectedEvent.location}</b></span>
                  </div>
                )}
              </div>

              {/* Add to Google Calendar 1-Click Link */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('calendar.addToGoogleCalendar', 'Add to Google Calendar (1-Click)')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold">{t('calendar.createEventTitle', 'Add Custom Family Event')}</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  {t('calendar.eventTitleLabel', 'Event Title')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasongo Family Annual Reunion 2026"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {t('calendar.eventTypeLabel', 'Event Type')}
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="reunion">Family Reunion</option>
                    <option value="gathering">Family Gathering</option>
                    <option value="ceremony">Ceremony / Milestone</option>
                    <option value="memorial">Memorial Service</option>
                    <option value="other">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {t('calendar.startDateLabel', 'Start Date & Time')} *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  {t('calendar.locationLabel', 'Location')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kinshasa, DRC or Lake Resort"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  {t('calendar.descriptionLabel', 'Description / Details')}
                </label>
                <textarea
                  rows="3"
                  placeholder="Additional details for family members..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="annual_recurring"
                  checked={newEvent.is_annual_recurring}
                  onChange={(e) => setNewEvent({ ...newEvent, is_annual_recurring: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="annual_recurring" className="text-slate-300 font-medium cursor-pointer">
                  {t('calendar.recurringLabel', 'Repeats annually every year on this date')}
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  {creating ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync & External iCal Export Modal */}
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
