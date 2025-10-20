import CategoryPills from '../CategoryPills'

export default function CategoryPillsExample() {
  return (
    <div className="p-4">
      <CategoryPills 
        categories={["All News", "Local", "National", "SPORT"]}
        onSelect={(cat) => console.log('Selected:', cat)}
      />
    </div>
  )
}
