import React from 'react';
import { useTranslation } from 'react-i18next';

const Timeline = ({ members, onMemberClick }) => {
    const { t } = useTranslation();

    // 1. Extract all events (births and deaths)
    const events = [];
    members.forEach(member => {
        if (member.birth_date) {
            events.push({
                id: `birth-${member.id}`,
                date: new Date(member.birth_date),
                type: 'birth',
                member: member
            });
        }
        if (member.death_date) {
            events.push({
                id: `death-${member.id}`,
                date: new Date(member.death_date),
                type: 'death',
                member: member
            });
        }
    });

    // 2. Sort events chornologically
    events.sort((a, b) => a.date - b.date);

    // 3. Group by Year
    const eventsByYear = {};
    events.forEach(event => {
        const year = event.date.getFullYear();
        if (!eventsByYear[year]) eventsByYear[year] = [];
        eventsByYear[year].push(event);
    });

    const years = Object.keys(eventsByYear).sort((a, b) => a - b);

    return (
        <div className="timeline-container">
            {years.length === 0 ? (
                <div className="empty-state">
                    <p>{t('messages.noTimelineData', 'No timeline data available. Add birth dates to members.')}</p>
                </div>
            ) : (
                <div className="timeline">
                    <div className="timeline-line"></div>
                    {years.map(year => (
                        <div key={year} className="timeline-year-group">
                            <div className="timeline-year-marker">{year}</div>
                            <div className="timeline-events">
                                {eventsByYear[year].map(event => (
                                    <div
                                        key={event.id}
                                        className={`timeline-card ${event.type}`}
                                        onClick={() => onMemberClick(event.member)}
                                    >
                                        <div className="timeline-icon">
                                            {event.type === 'birth' ? '👶' : '⚰️'}
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-date">
                                                {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="timeline-title">
                                                <strong>{event.member.first_name} {event.member.last_name}</strong>
                                                {event.type === 'birth' ? t('timeline.wasBorn', ' was born') : t('timeline.passedAway', ' passed away')}
                                            </div>
                                            {event.member.photo && (
                                                <div className="timeline-photo">
                                                    <img src={event.member.photo} alt="" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Timeline;
