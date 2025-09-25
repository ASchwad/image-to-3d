import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            React + Vite + Tailwind + shadcn/ui
          </h1>
          <p className="text-muted-foreground text-lg">
            A modern, reusable boilerplate for building React applications
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Counter Example</CardTitle>
              <CardDescription>
                A simple state management example with shadcn/ui Button
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-mono">{count}</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCount(count - 1)}
                >
                  Decrement
                </Button>
                <Button onClick={() => setCount(count + 1)}>
                  Increment
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
              <CardDescription>
                shadcn/ui form components with Tailwind styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message"
                />
              </div>
              <Button className="w-full">Submit</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Features Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <li>✅ React 18</li>
              <li>✅ Vite for fast development</li>
              <li>✅ TypeScript support</li>
              <li>✅ Tailwind CSS v4</li>
              <li>✅ shadcn/ui components</li>
              <li>✅ @tanstack/react-query for API calls</li>
              <li>✅ Path aliases (@/*)</li>
              <li>✅ ESLint configuration</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
