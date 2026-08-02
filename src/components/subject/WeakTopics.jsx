/**
 * WeakTopics
 * Reusable list of focus/weak topics with accuracy values.
 */
function WeakTopics({ title = 'Focus Areas', items = [] }) {
  return (
    <div className="weak-topics">
      <div className="chart-title">{title}</div>
      {items.map((topic) => (
        <div className="weak-topic-item" key={topic.label}>
          <div className="weak-topic-name">
            {topic.label}
            {topic.meta ? <div className="breakdown-meta">{topic.meta}</div> : null}
          </div>
          <div className="weak-topic-accuracy">{topic.value}</div>
        </div>
      ))}
    </div>
  )
}

export default WeakTopics