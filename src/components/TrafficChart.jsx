import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function TrafficChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="hour" />

        <YAxis />

        <Tooltip />

        <Legend />

  

        <Line
          type="monotone"
          dataKey="congestion"
          stroke="#ef4444"
          strokeWidth={3}
          dot={false}
        />

        
        
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default TrafficChart;