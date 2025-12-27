interface IosEvent {
    title: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
    description?: string;
}

export const addToAppleCalendar = (event: IosEvent) => {
    // 1. 날짜 포맷팅 (YYYYMMDDTHHmmSS 형식 - UTC 기준 아님, 로컬 시간 사용)
    // 아이폰은 'Z'가 없으면 사용자의 현재 로컬 시간대로 인식하여 더 안전합니다.
    const formatDate = (date: Date) => {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`; // Always return string
        return (
            `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
        );
    };

    const start = formatDate(event.startDate);
    const end = event.endDate
        ? formatDate(event.endDate)
        : formatDate(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // 종료 시간 없으면 1시간 뒤

    // 2. .ics 파일 내용 생성 (Apple 캘린더 호환)
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dept of Physical Therapy//Calendar//KO', // 고유 ID 아무거나
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:${event.title}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `LOCATION:${event.location || ''}`,
        `DESCRIPTION:${event.description || ''}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n'); // 줄바꿈 중요

    // 3. 아이폰 사파리용 다운로드 트리거
    // Blob 객체를 만들어 가상의 URL을 생성합니다.
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    // 링크를 만들고 강제로 클릭하게 함
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'schedule.ics');
    document.body.appendChild(link);
    link.click();

    // 청소
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
