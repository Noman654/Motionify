import { SRTItem } from '../types';

const timeToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':');
  const [secs, ms] = seconds.split(',');
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(secs, 10) +
    parseInt(ms, 10) / 1000
  );
};

export const parseSRT = (data: string): SRTItem[] => {
  const normalizedData = data.replace(/\r\n/g, '\n');
  const blocks = normalizedData.split('\n\n');
  const items: SRTItem[] = [];

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0], 10);
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      const [start, end] = timeLine.split(' --> ');
      
      if (start && end) {
        items.push({
          id,
          startTime: timeToSeconds(start.trim()),
          endTime: timeToSeconds(end.trim()),
          text: textLines.join(' '),
        });
      }
    }
  });

  return items;
};