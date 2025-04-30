import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { ListGroup, Badge} from 'react-bootstrap'

ChartJS.register(ArcElement, Tooltip, Legend)

function Charts({ chartData }) {
  const options = {
    responsive: true,
    label: {
      title: 'Poll Result',
    },
  }

  const getVotes = () => {
    const { options } = chartData
    const votes = options.map((option) => option.votes)
    return votes
  }

  const getLabels = () => {
    const { options } = chartData
    const option = options.map((option) => option.option)
    return option
  }
  const votes = getVotes()
  const labels = getLabels()
  const data = {
    labels: labels,
    datasets: [
      {
        id: 1,
        label: 'Poll result',
        data: votes,
        backgroundColor: [
          'rgba(255, 99, 132, 0.9)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(255, 90, 132, 0.7)',
          'rgba(54, 16, 235, 0.7)',
          'rgba(255, 186, 86, 0.7)',
          'rgba(75, 172, 162, 0.7)',
          'rgba(153, 90, 255, 0.7)',
          'rgba(255, 21, 64, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
      },
    ],
  }
  return (
    <>
      <div className="chart-container p-4 z-index">
        <h5 className="text-danger">Poll chart</h5>
        <Doughnut data={data} options={options}/>
      </div>
      <div className="mr-2 list-container">
        <div><h2>Votes</h2></div>
        <ListGroup className="mt-4 ">
          {labels.map((label, idx) => (
            <ListGroup.Item
              as="li"
              key={idx}
              className="d-flex justify-content-between align-items-start"
            >
              <div className="fw-bold mr-2">{label}</div>
              <Badge variant="primary" pill>
                votes : {votes[idx]}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    </>
  )
}

export default Charts
