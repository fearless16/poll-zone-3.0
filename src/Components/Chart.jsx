import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import styles from './Chart.module.css'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

function Charts({ chartData }) {
  const options = {
    responsive: true,
    label: {
      title: 'Poll Result',
    },
  }
  const data = {
    labels: chartData.options.map((o) => o.option),
    datasets: [
      {
        id: 1,
        label: 'Poll Result',
        data: chartData.options.map((o) => o.votes),
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
    <div className={styles.chartBox}>
      <Doughnut data={data} options={options} />
    </div>
  )
}

export default Charts
