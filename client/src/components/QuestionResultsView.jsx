import PollBars from './PollBars.jsx';
import WordCloud from './WordCloud.jsx';
import OpenEndedFeed from './OpenEndedFeed.jsx';
import RatingHistogram from './RatingHistogram.jsx';
import { countsByOption, wordFrequency, ratingDistribution } from '../aggregate.js';

// Renders the right aggregate visualization for a question type from a flat
// list of answers — used both for the live in-progress view (fed by
// accumulated state:live-answer events) and the final state:reveal view
// (fed by the results array), so the two always look consistent.
export default function QuestionResultsView({ type, options, answers, correctIndex, shapes }) {
  if (type === 'word_cloud') {
    return <WordCloud words={wordFrequency(answers.map((a) => a.answerText))} />;
  }

  if (type === 'open_ended') {
    return (
      <OpenEndedFeed
        items={answers.filter((a) => a.answerText).map((a) => ({ text: a.answerText, teamName: a.teamName }))}
      />
    );
  }

  if (type === 'rating_scale') {
    const opts = Array.isArray(options) ? { min: 1, max: 5 } : options;
    const dist = ratingDistribution(answers.map((a) => a.answerValue), opts.min, opts.max);
    return (
      <RatingHistogram
        min={opts.min}
        max={opts.max}
        minLabel={opts.minLabel}
        maxLabel={opts.maxLabel}
        counts={dist.counts}
        average={dist.average}
        count={dist.count}
      />
    );
  }

  // multiple_choice / poll
  const counts = countsByOption(options.length, answers.map((a) => a.answerIndex));
  return <PollBars options={options} counts={counts} correctIndex={correctIndex} shapes={shapes} />;
}
