import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatAxisDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const adjustedY = name === "Fatality" ? y - 20 : y;

  return (
    <text 
      x={x} 
      y={adjustedY} 
      fill="black" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {`${name}: ${value}`}
    </text>
  );
};

const Dashboard = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [adasInjuries, setAdasInjuries] = useState([]);
  const [adsInjuries, setAdsInjuries] = useState([]);
  const [totalADAS, setTotalADAS] = useState(0);
  const [totalADS, setTotalADS] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Fetching CSV files...');
        const [adasResponse, adsResponse] = await Promise.all([
          fetch('/SGO202101_Incident_Reports_ADAS.csv'),
          fetch('/SGO202101_Incident_Reports_ADS.csv')
        ]);

        if (!adasResponse.ok || !adsResponse.ok) {
          throw new Error('Failed to fetch CSV files');
        }

        const adasText = await adasResponse.text();
        const adsText = await adsResponse.text();
        
        console.log('Parsing CSV data...');
        const adasData = Papa.parse(adasText, { 
          header: true, 
          skipEmptyLines: true 
        }).data;
        
        const adsData = Papa.parse(adsText, { 
          header: true, 
          skipEmptyLines: true 
        }).data;

        console.log('Processing monthly data...');
        const monthlyAccidents = {};
        [...adasData, ...adsData].forEach(row => {
          const date = new Date(row['Incident Date']);
          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyAccidents[key] = {
              date: formatDate(date),
              axisDate: formatAxisDate(date),
              count: (monthlyAccidents[key]?.count || 0) + 1,
              sortKey: key
            };
          }
        });

        const monthlyDataArray = Object.values(monthlyAccidents)
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        console.log('Processing injury data...');
        const adasInjuriesData = Object.entries(
          adasData.reduce((acc, row) => {
            const severity = row['Highest Injury Severity Alleged'];
            if (severity && severity !== 'Unknown') {
              acc[severity] = (acc[severity] || 0) + 1;
            }
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value }));

        const adsInjuriesData = Object.entries(
          adsData.reduce((acc, row) => {
            const severity = row['Highest Injury Severity Alleged'];
            if (severity && severity !== 'Unknown') {
              acc[severity] = (acc[severity] || 0) + 1;
            }
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value }));

        setMonthlyData(monthlyDataArray);
        setAdasInjuries(adasInjuriesData);
        setAdsInjuries(adsInjuriesData);
        setTotalADAS(adasInjuriesData.reduce((sum, item) => sum + item.value, 0));
        setTotalADS(adsInjuriesData.reduce((sum, item) => sum + item.value, 0));

        console.log('Data loaded successfully');
        setIsLoading(false);

      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = monthlyData.find(item => item.axisDate === label);
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-semibold">{dataPoint.date}</p>
          <p>Crashes: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Crash Analysis Dashboard</h1>
      
      {/* Monthly Crashes Bar Chart */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Monthly Crashes (2021-2024)</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="axisDate"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{fontSize: 12}}
                padding={{ left: 10, right: 10 }}
                interval={3}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="count" 
                fill="#8884d8" 
                name="Number of Crashes"
                minPointSize={5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Injury Severity Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            ADAS Injury Severity
            <span className="block text-base font-normal text-gray-600">
              Total Cases: {totalADAS}
            </span>
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adasInjuries}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {adasInjuries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">
            ADS Injury Severity
            <span className="block text-base font-normal text-gray-600">
              Total Cases: {totalADS}
            </span>
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adsInjuries}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    strokeWidth: 2,
                    stroke: '#666',
                  }}
                  label={CustomLabel}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {adsInjuries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;